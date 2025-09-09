import type { auth } from "@repo/auth";
import type { ServerWebSocket } from "bun";
import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { getOrganization } from "..";

export const wsRoute = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}>();

type ClientInfo = {
	socket: ServerWebSocket;
	wsClientId: string;
	clientId: string;
	orgId: string;
	channel: string;
	lastPong: number; // ✅ track last pong here
};
// Base message type
type WSBaseMessage = {
	type: string;
	// biome-ignore lint/suspicious/noExplicitAny: <any>
	data?: any;
	meta?: {
		ts: number;
		channel?: string;
		orgId?: string;
		// biome-ignore lint/suspicious/noExplicitAny: <any>
		[key: string]: any;
	};
};
const rooms = new Map<string, ClientInfo[]>(); // `${orgId}:${channel}`
const wsClientIds = new Map<ServerWebSocket, string>();

// ✅ waiting room constants
const WAITING_ORG = "WAITING_ROOM";
const WAITING_CHANNEL = "main";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function sendToClients(
	clients: ClientInfo[] = [],
	message: WSBaseMessage,
	orgId: string,
	channel: string,
	exclude?: ServerWebSocket
) {
	for (const c of clients) {
		if (exclude && c.socket === exclude) continue;
		// Always clone + attach meta
		const msgWithMeta: WSBaseMessage = {
			...message,
			meta: {
				ts: Date.now(),
				channel,
				orgId,
				...(message.meta || {}),
			},
		};
		try {
			c.socket.send(JSON.stringify(msgWithMeta));
		} catch (err) {
			console.error("Send failed", c.wsClientId, err);
		}
	}
}

// Internal helper to send
function send(ws: ServerWebSocket, message: WSBaseMessage) {
	const msgWithMeta: WSBaseMessage = {
		...message,
		meta: {
			ts: Date.now(),
			...(message.meta || {}),
		},
	};
	ws.send(JSON.stringify(msgWithMeta));
}

/**
 * Broadcast a message to a specific org's channel and to firehose listeners.
 *
 * @param orgId - The organization ID to which the message is broadcasted.
 * @param channel - The channel within the organization to which the message is sent.
 * @param message - The message object to be broadcasted.
 * @param exclude - An optional WebSocket to exclude from receiving the message (e.g., the sender).
 * @returns void
 * @example
 * ```ts
 * broadcast("org_123", "public", { type: "UPDATE", data: { ... } });
 * ```
 */
export function broadcast(orgId: string, channel: string, message: WSBaseMessage, exclude?: ServerWebSocket) {
	// Send to the specific channel
	sendToClients(rooms.get(`${orgId}:${channel}`), message, orgId, channel, exclude);

	// Send to firehose listeners, but include channel info
	const firehoseMsg = {
		type: "FIREHOSE",
		data: {
			channel,
			payload: message,
		},
	};
	sendToClients(rooms.get(`${orgId}:*`), firehoseMsg, orgId, "*", exclude);
}

/**
 * Broadcast a message to a specific org's public channel.
 *
 * @param orgId - The organization ID to which the message is broadcasted.
 * @param message - The message object to be broadcasted.
 * @param exclude - An optional WebSocket to exclude from receiving the message (e.g., the sender).
 * @returns void
 * @example
 * ```ts
 * broadcastPublic("org_123", { type: "UPDATE", data: { ... } });
 * ```
 */
export function broadcastPublic(orgId: string, message: WSBaseMessage, exclude?: ServerWebSocket) {
	// Send to the org's public channel
	sendToClients(rooms.get(`${orgId}:public`), message, orgId, "public", exclude);

	// // Send to firehose listeners, include channel info
	// const firehoseMsg = {
	// 	type: "FIREHOSE",
	// 	data: {
	// 		channel: "public",
	// 		payload: message,
	// 	},
	// };
	// sendToClients(rooms.get(`${orgId}:*`), firehoseMsg, exclude);
}

/**
 * Find a connected WebSocket client by its unique WebSocket client ID.
 *
 * @param clientId - The unique WebSocket client ID to search for.
 * @return The ClientInfo object if found, otherwise undefined.
 * @example
 * ```ts
 * const client = findClientByWsId("some-unique-ws-client-id");
 * if (client) {
 *   console.log("Client found:", client);
 * } else {
 *  console.log("Client not found");
 * }
 * ```
 */
export function findClientByWsId(clientId: string) {
	for (const clients of rooms.values()) {
		const found = clients.find((c) => c.wsClientId === clientId);
		if (found) return found;
	}
}

// ------------------------------------------------------------------
// Subscription Helpers
// ------------------------------------------------------------------

function unsubscribe(socket: ServerWebSocket) {
	const wsClientId = wsClientIds.get(socket);
	for (const [key, clients] of rooms) {
		const filtered = clients.filter((c) => c.socket !== socket);
		if (filtered.length < clients.length) {
			const [orgId, channel] = key.split(":");
			if (orgId && channel && orgId !== WAITING_ORG) {
				broadcast(
					orgId,
					channel,
					{
						type: "USER_UNSUBSCRIBED",
						data: { wsClientId, orgId, channel },
					},
					socket
				);
			}
		}
		filtered.length ? rooms.set(key, filtered) : rooms.delete(key);
	}
}

// Find client subscription
function findClient(socket: ServerWebSocket) {
	for (const clients of rooms.values()) {
		const found = clients.find((c) => c.socket === socket);
		if (found) return found;
	}
}

// Handle subscription
function handleSubscribe(ws: ServerWebSocket, wsClientId: string, clientId: string, orgId: string, channel: string) {
	const key = `${orgId}:${channel}`;
	if ((rooms.get(key) || []).some((c) => c.socket === ws)) {
		send(ws, {
			type: "ERROR",
			data: { message: `Already subscribed to ${orgId}:${channel}` },
		});
		return;
	}

	unsubscribe(ws);

	const info: ClientInfo = {
		socket: ws,
		wsClientId,
		clientId,
		orgId,
		channel,
		lastPong: Date.now(),
	};
	rooms.set(key, [...(rooms.get(key) || []), info]);
	send(ws, {
		type: "SUBSCRIBED",
		data: {
			orgId,
			channel,
		},
	});
	broadcast(orgId, channel, { type: "USER_SUBSCRIBED", data: { wsClientId, clientId, orgId, channel } }, ws);
}

function joinWaitingRoom(ws: ServerWebSocket, wsClientId: string, clientId: string, reason?: string) {
	// Clear any existing rooms first
	unsubscribe(ws);

	const waitingKey = `${WAITING_ORG}:${WAITING_CHANNEL}`;
	const info: ClientInfo = {
		socket: ws,
		wsClientId,
		clientId,
		orgId: WAITING_ORG,
		channel: WAITING_CHANNEL,
		lastPong: Date.now(),
	};
	rooms.set(waitingKey, [...(rooms.get(waitingKey) || []), info]);

	send(ws, {
		type: "WAITING_ROOM",
		data: {
			message: "You have been placed in the waiting room",
			reason,
			orgId: WAITING_ORG,
			channel: WAITING_CHANNEL,
		},
		meta: { ts: Date.now() },
	});
}

// ------------------------------------------------------------------
// WebSocket Route
// ------------------------------------------------------------------

wsRoute.get(
	"/ws",
	upgradeWebSocket((c) => ({
		onOpen: (_, ws) => {
			const session = c.get("session");
			const user = c.get("user");
			const wsClientId = crypto.randomUUID();
			wsClientIds.set(ws.raw, wsClientId);

			if (!session) {
				const orgId = c.req.query("orgId") || "default";
				send(ws.raw, {
					type: "CONNECTION_STATUS",
					data: {
						status: "connected",
						authenticated: false,
						wsClientId,
					},
					meta: {
						ts: Date.now(),
					},
				});
				handleSubscribe(ws.raw, wsClientId, "ANONYMOUS", orgId, "public");
				return;
			}

			// Authenticated but no org/channel yet → place in waiting room

			send(ws.raw, {
				type: "CONNECTION_STATUS",
				data: {
					status: "connected",
					authenticated: true,
					wsClientId,
				},
				meta: {
					ts: Date.now(),
				},
			});
			joinWaitingRoom(ws.raw, wsClientId, user?.id);
		},

		onMessage: async (event, ws) => {
			try {
				const msg = JSON.parse(event.data as string);
				const wsClientId = wsClientIds.get(ws.raw) as string;
				const session = c.get("session");
				const user = c.get("user");
				const client = findClient(ws.raw);

				// PONG
				if (msg.type === "PONG") {
					if (client) client.lastPong = Date.now();
					return;
				}

				// Block waiting room users except SUBSCRIBE/UNSUBSCRIBE
				if (client?.orgId === WAITING_ORG && client.channel === WAITING_CHANNEL) {
					if (!["SUBSCRIBE", "UNSUBSCRIBE"].includes(msg.type)) {
						return send(ws.raw, {
							type: "ERROR",
							data: { message: "You are in waiting room. Please SUBSCRIBE to an org/channel" },
							meta: { ts: Date.now() },
						});
					}
				}

				// SUBSCRIBE
				if (msg.type === "SUBSCRIBE") {
					const { orgId, channel } = msg;
					if (!orgId || !channel) {
						return send(ws.raw, {
							type: "ERROR",
							data: { message: "Need orgId+channel" },
							meta: { ts: Date.now() },
						});
					}
					// ✅ enforce session: only allow "public" channel if unauthenticated
					if (!session && channel !== "public") {
						return send(ws.raw, {
							type: "ERROR",
							data: { message: "Auth required for private channels" },
							meta: { ts: Date.now() },
						});
					} else if (channel === "public" && !session) {
						handleSubscribe(ws.raw, wsClientId, crypto.randomUUID(), orgId, channel);
					} else {
						const organization = await getOrganization(orgId, user.id);
						if (organization) {
							handleSubscribe(ws.raw, wsClientId, user.id, orgId, channel);
						} else {
							ws.close();
						}
					}
					return;
				}
				// ✅ Handle UNSUBSCRIBE (auth only)
				if (msg.type === "UNSUBSCRIBE") {
					if (!session) {
						return send(ws.raw, {
							type: "ERROR",
							data: { message: "Anonymous users cannot unsubscribe" },
							meta: { ts: Date.now() },
						});
					}
					joinWaitingRoom(ws.raw, wsClientId, user?.id);
				}
			} catch (err) {
				send(ws.raw, {
					type: "ERROR",
					data: { error: err instanceof Error ? err.message : String(err) },
					meta: { ts: Date.now() },
				});
			}
		},

		onClose: (_, ws) => {
			unsubscribe(ws.raw);
			wsClientIds.delete(ws.raw);
			console.log("Connection closed");
		},
	}))
);

// ✅ Heartbeat interval
// Send a PING every 30 seconds
// Close dead sockets after 60 seconds of no PONG
setInterval(() => {
	const now = Date.now();
	for (const [socket, wsClientId] of wsClientIds) {
		const client = findClient(socket);
		if (!client) continue;

		if (now - client.lastPong > 60_000) {
			console.log("Closing dead socket", wsClientId);
			socket.close();
			unsubscribe(socket);
		} else {
			try {
				socket.send(JSON.stringify({ type: "PING", ts: now }));
			} catch {
				console.log("Failed to ping, closing", wsClientId);
				socket.close();
				unsubscribe(socket);
			}
		}
	}
}, 30_000);
