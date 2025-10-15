import type { ServerWebSocket } from "bun";
import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { type AppEnv, getOrganization } from "..";

export const wsRoute = new Hono<AppEnv>();

type ClientInfo = {
	socket: ServerWebSocket; // raw WebSocket connection
	wsClientId: string; // unique per connection
	clientId: string; // logical user ID (can have multiple connections)
	orgId: string; // org subscription
	channel: string; // channel subscription
};
// Base message type
export type WSBaseMessage = {
	type:
		| "CONNECTION_STATUS"
		| "SERVER_MESSAGE"
		| "ERROR"
		| "PING"
		| "PONG"
		| "MESSAGE"
		| "SUBSCRIBED"
		| "SUBSCRIBE"
		| "UNSUBSCRIBE"
		| "USER_UNSUBSCRIBED"
		| "USER_SUBSCRIBED"
		| "UPDATE_ORG"
		| "CREATE_PROJECT"
		| "CREATE_TASK"
		| "UPDATE_TASK"
		| "CREATE_LABEL"
		| "FIREHOSE"
		| "CONNECTIONS_SNAPSHOT"
		| "WAITING_ROOM"
		| "DISCONNECTED";
	// biome-ignore lint/suspicious/noExplicitAny: <any>
	data?: any;
	orgId?: string;
	channel?: string;
	scope: "INDIVIDUAL" | "CHANNEL" | "PUBLIC";
	meta?: {
		ts: number;
		channel?: string;
		orgId?: string;
		[key: string]: string | number | undefined | null;
	};
};
type wsClientsType = {
	id: string;
	connectedAt: number; // ✅ when this connection was first established
	lastMessageAt: number;
	offenceCount: number;
	// Heartbeat info
	lastPong: number; // ✅ last pong received from heartbeat
	lastLatency: number; // ✅ last measured RTT
};
const rooms = new Map<string, Set<ClientInfo>>();
const wsClients = new Map<ServerWebSocket, wsClientsType>();

// ✅ waiting room constants
const WAITING_ORG = "WAITING_ROOM";
const WAITING_CHANNEL = "main";

// Admin constants
const ADMIN_ORG = "__ADMIN__";
const CONNECTIONS_CHANNEL = "__CONNECTIONS__"; // roster of connected clients
// const EVENTS_CHANNEL = "__EVENTS__"; // real-time firehose

const MIN_MESSAGE_INTERVAL = 200; // ms between messages (~10 msgs/sec)
// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function sendToClients(
	clients: Iterable<ClientInfo> = [],
	message: WSBaseMessage,
	orgId: string,
	channel: string,
	exclude?: ServerWebSocket
) {
	for (const c of clients) {
		try {
			const sock = c.socket;

			// Skip sender or invalid sockets
			if (!sock || (exclude && sock === exclude)) continue;
			if (sock.readyState !== 1) continue; // 1 = OPEN

			// Clone + attach meta
			const msgWithMeta: WSBaseMessage = {
				...message,
				meta: {
					ts: Date.now(),
					channel,
					orgId,
					...(message.meta || {}),
				},
			};

			sock.send(JSON.stringify(msgWithMeta));
		} catch (err) {
			// biome-ignore lint/suspicious/noExplicitAny: <needed>
			console.error("Send failed:", (c as any).wsClientId, err);
			// Optionally remove closed/broken sockets
			try {
				c.socket.close();
			} catch {}
			unsubscribe(c.socket);
		}
	}
}

/**
 * Send a message to an individual WebSocket connection.
 *
 * @param ws - The target WebSocket connection to send the message to.
 * @param message - The message object to be sent. The `scope` field will be
 * automatically set to `"INDIVIDUAL"`, and a `meta.ts` timestamp will be added.
 *
 * @returns void
 *
 * @example
 * ```ts
 * broadcastIndividual(ws, { type: "UPDATE", data: { ... } });
 * ```
 */
export function broadcastIndividual(ws: ServerWebSocket, message: Omit<WSBaseMessage, "scope">) {
	const msgWithMeta: WSBaseMessage = {
		...message,
		scope: "INDIVIDUAL",
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
 * @param message - The message object to be sent. The `scope` field will be
 * automatically set to `"CHANNEL"`, and a `meta.ts` timestamp will be added.
 * @param exclude - An optional WebSocket to exclude from receiving the message (e.g., the sender).
 * @returns void
 * @example
 * ```ts
 * broadcast("org_123", "public", { type: "UPDATE", data: { ... } });
 * ```
 */
export function broadcast(
	orgId: string,
	channel: string,
	message: Omit<WSBaseMessage, "scope">,
	exclude?: ServerWebSocket
) {
	const fullMsg: WSBaseMessage = {
		...message,
		scope: "CHANNEL",
	};
	// Send to the specific channel
	sendToClients(rooms.get(`${orgId}:${channel}`), fullMsg, orgId, channel, exclude);

	// Send to firehose listeners, but include channel info
	const firehoseMsg: WSBaseMessage = {
		type: "FIREHOSE",
		scope: "CHANNEL",
		data: {
			channel,
			payload: fullMsg,
		},
	};
	sendToClients(rooms.get(`${orgId}:*`), firehoseMsg, orgId, "*", exclude);
}

/**
 * Broadcast to a room and optionally its parent room.
 *
 * @param orgId - organization identifier
 * @param channel - current room key, e.g. "channel:123;subChannel:456"
 * @param message - message payload (scope auto-set)
 * @param exclude - optional socket to skip
 * @param includeParent - whether to also send to the parent channel
 */
export function broadcastToRoom(
	orgId: string,
	channel: string,
	message: Omit<WSBaseMessage, "scope">,
	exclude?: ServerWebSocket,
	includeParent = false
) {
	const fullMsg: WSBaseMessage = { ...message, scope: "CHANNEL" };
	const seen = new Set<ServerWebSocket>();
	const targets: ClientInfo[] = [];

	const addRoom = (key: string) => {
		const clients = rooms.get(`${orgId}:${key}`);
		if (!clients) return;
		for (const c of clients) {
			if (exclude && c.socket === exclude) continue;
			if (seen.has(c.socket)) continue;
			seen.add(c.socket);
			targets.push(c);
		}
	};

	// always to the specific channel
	addRoom(channel);

	// optionally include parent
	if (includeParent && channel.includes(";")) {
		const parent = channel.split(";")[0];
		parent && addRoom(parent);
	}

	if (targets.length > 0) {
		sendToClients(targets, fullMsg, orgId, channel, exclude);
	}
}

/**
 * Broadcast a message to a specific org's public channel.
 *
 * @param orgId - The organization ID to which the message is broadcasted.
 * @param message - The message object to be sent. The `scope` field will be
 * automatically set to `"PUBLIC"`, and a `meta.ts` timestamp will be added.
 * @param exclude - An optional WebSocket to exclude from receiving the message (e.g., the sender).
 * @returns void
 * @example
 * ```ts
 * broadcastPublic("org_123", { type: "UPDATE", data: { ... } });
 * ```
 */
export function broadcastPublic(orgId: string, message: Omit<WSBaseMessage, "scope">, exclude?: ServerWebSocket) {
	const fullMsg: WSBaseMessage = {
		...message,
		scope: "PUBLIC",
	};
	// Send to the org's public channel
	sendToClients(rooms.get(`${orgId}:public`), fullMsg, orgId, "public", exclude);
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
export function findClientByWsId(socket: ServerWebSocket) {
	for (const clients of rooms.values()) {
		for (const c of clients) if (c.socket === socket) return c;
	}
}

/**
 * Find all connected WebSocket clients for a given user ID.
 *
 * Since a user can have multiple WebSocket connections (e.g., across different
 * orgs, channels, or devices), this returns an array of ClientInfo objects.
 *
 * @param userId - The user ID (`clientId`) to search for.
 * @returns An array of ClientInfo objects if found, otherwise an empty array.
 *
 * @example
 * ```ts
 * const clients = findClientsByUserId("user_123");
 * if (clients.length > 0) {
 *   console.log(`User has ${clients.length} active connections:`);
 *   clients.forEach(c =>
 *     console.log(`- org=${c.orgId}, channel=${c.channel}, wsId=${c.wsClientId}`)
 *   );
 * } else {
 *   console.log("No active WebSocket connections for this user.");
 * }
 * ```
 */
export function findClientsByUserId(userId: string): ClientInfo[] {
	const results: ClientInfo[] = [];
	for (const clients of rooms.values()) {
		for (const client of clients) {
			if (client.clientId === userId) {
				results.push(client);
			}
		}
	}
	return results;
}

/**
 * Retrieve a snapshot of all currently connected WebSocket clients across all
 * organizations and channels.
 *
 * Each connected client is represented by an object that contains the
 * connection's WebSocket client ID (`wsClientId`), the logical user ID
 * (`clientId`), the organization and channel they are subscribed to, and the
 * latest recorded `lastPong` timestamp (used for heartbeat/latency monitoring).
 *
 * This is primarily useful for administrative or monitoring purposes, such as
 * populating a firehose snapshot when an admin connects.
 *
 * @returns An array of objects describing each active WebSocket connection.
 *
 * @example
 * ```ts
 * const snapshot = getAllConnectedClients();
 * console.log(`Currently ${snapshot.length} active connections:`);
 *
 * snapshot.forEach(client => {
 *   console.log(
 *     `- user=${client.clientId}, wsId=${client.wsClientId}, ` +
 *     `org=${client.orgId}, channel=${client.channel}, ` +
 *     `authenticated=${client.authenticated}`
 *   );
 * });
 * ```
 */
function getAllConnectedClients() {
	const connected: Array<{
		wsClientId: string;
		clientId: string;
		orgId: string;
		channel: string;
		lastPong: number;
		lastLatency: number;
		connectedAt: number;
		lastMessageAt: number;
		authenticated?: boolean;
	}> = [];

	for (const clients of rooms.values()) {
		for (const c of clients) {
			const wsClientId = wsClients.get(c.socket) as wsClientsType;
			connected.push({
				wsClientId: c.wsClientId,
				clientId: c.clientId,
				orgId: c.orgId,
				channel: c.channel,
				lastPong: wsClientId.lastPong,
				lastLatency: wsClientId.lastLatency,
				connectedAt: wsClientId.connectedAt,
				lastMessageAt: wsClientId.lastMessageAt,
				authenticated: c.clientId !== "ANONYMOUS",
			});
		}
	}

	return connected;
}

// ------------------------------------------------------------------
// Subscription Helpers
// ------------------------------------------------------------------

function unsubscribe(socket: ServerWebSocket) {
	const wsClientId = wsClients.get(socket);
	for (const [key, clients] of rooms) {
		if (!clients) continue;
		const before = clients.size;
		for (const c of Array.from(clients)) {
			if (c.socket === socket) clients.delete(c);
		}
		if (clients.size < before) {
			const [orgId, channel] = key.split(":");
			if (orgId && channel && orgId !== WAITING_ORG) {
				const id = wsClientId?.id;
				broadcast(orgId, channel, { type: "USER_UNSUBSCRIBED", data: { id, orgId, channel } }, socket);
			}
			if (clients.size === 0) rooms.delete(key);
		}
	}
}

// Handle subscription
function handleSubscribe(ws: ServerWebSocket, wsClientId: string, clientId: string, orgId: string, channel: string) {
	const key = `${orgId}:${channel}`;
	let set = rooms.get(key);
	if (!set) {
		set = new Set<ClientInfo>();
		rooms.set(key, set);
	}

	// already subscribed?
	if (Array.from(set).some((c) => c.socket === ws)) {
		broadcastIndividual(ws, {
			type: "ERROR",
			data: { message: `Already subscribed to ${orgId}:${channel}` },
		});
		return;
	}

	// remove from any previous
	unsubscribe(ws);

	const info: ClientInfo = { socket: ws, wsClientId, clientId, orgId, channel };
	set.add(info);

	broadcastIndividual(ws, {
		type: "SUBSCRIBED",
		data: { orgId, channel },
	});

	broadcast(orgId, channel, { type: "USER_SUBSCRIBED", data: { wsClientId, clientId, orgId, channel } }, ws);
}

function joinWaitingRoom(ws: ServerWebSocket, wsClientId: string, clientId: string, reason?: string) {
	unsubscribe(ws);
	const waitingKey = `${WAITING_ORG}:${WAITING_CHANNEL}`;
	let set = rooms.get(waitingKey);
	if (!set) {
		set = new Set<ClientInfo>();
		rooms.set(waitingKey, set);
	}
	const info: ClientInfo = {
		socket: ws,
		wsClientId,
		clientId,
		orgId: WAITING_ORG,
		channel: WAITING_CHANNEL,
	};
	set.add(info);

	broadcastIndividual(ws, {
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
			wsClients.set(ws.raw, {
				id: wsClientId,
				connectedAt: Date.now(),
				lastPong: Date.now(),
				lastLatency: -1,
				lastMessageAt: 0,
				offenceCount: 0,
			});
			const orgId = c.req.query("orgId");

			if (!session) {
				broadcastIndividual(ws.raw, {
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
				if (orgId) {
					handleSubscribe(ws.raw, wsClientId, "ANONYMOUS", orgId, "public");
				} else {
					handleSubscribe(ws.raw, wsClientId, "ANONYMOUS", "default", "public");
				}
				return;
			}
			broadcastIndividual(ws.raw, {
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
			if (orgId) {
				handleSubscribe(ws.raw, wsClientId, user.id, orgId, "public");
			}
		},

		onMessage: async (event, ws) => {
			try {
				const now = Date.now();
				const msg: WSBaseMessage = JSON.parse(event.data as string);
				const wsClient = wsClients.get(ws.raw) as wsClientsType;
				const session = c.get("session");
				const user = c.get("user");
				const client = findClientByWsId(ws.raw);
				// Rate limit messages (except PING/PONG)
				if (!["PING", "PONG"].includes(msg.type)) {
					const elapsed = now - wsClient.lastMessageAt;
					if (elapsed < MIN_MESSAGE_INTERVAL) {
						wsClient.offenceCount++;
						if (wsClient.offenceCount <= 3) {
							broadcastIndividual(ws.raw, {
								type: "ERROR",
								data: { message: "Please slow down — you’re sending requests too quickly." },
								meta: { ts: now },
							});
						} else if (wsClient.offenceCount > 5) {
							broadcastIndividual(ws.raw, {
								type: "ERROR",
								data: { message: "Rate limit exceeded. Disconnecting." },
								meta: { ts: now },
							});
							console.warn("Rate‑limited / closing flooder", wsClient.id);
							ws.close();
							unsubscribe(ws.raw);
							return;
						}
						return; // drop this fast message
					}
					wsClient.lastMessageAt = now;
				}
				// Block waiting room users except SUBSCRIBE/UNSUBSCRIBE/PONG
				if (client?.orgId === WAITING_ORG && client.channel === WAITING_CHANNEL) {
					if (!["SUBSCRIBE", "UNSUBSCRIBE", "PONG"].includes(msg.type)) {
						return broadcastIndividual(ws.raw, {
							type: "ERROR",
							data: { message: "You are in waiting room. Please SUBSCRIBE to an org/channel" },
							meta: { ts: now },
						});
					}
				}
				switch (msg.type) {
					case "PONG":
						if (client) {
							wsClient.lastPong = now;
							wsClient.lastLatency = msg.meta ? (msg.meta.latency as number) : -9999;
						}
						return;
					case "SUBSCRIBE":
						if (msg.orgId === ADMIN_ORG && msg.channel === CONNECTIONS_CHANNEL) {
							if (user.role !== "admin") {
								broadcastIndividual(ws.raw, {
									type: "ERROR",
									data: { message: "Unauthorized for CONNECTIONS_SNAPSHOT" },
									meta: { ts: now },
								});
								ws.close();
								return;
							}
							handleSubscribe(ws.raw, wsClient.id, user.id, ADMIN_ORG, CONNECTIONS_CHANNEL);
							// ✅ Send snapshot of connected clients to *this admin only*
							const snapshot = getAllConnectedClients();
							broadcastIndividual(ws.raw, {
								type: "CONNECTIONS_SNAPSHOT",
								data: snapshot,
							});
							return;
						}
						if (msg.type === "SUBSCRIBE") {
							const { orgId, channel } = msg;
							if (!orgId || !channel) {
								return broadcastIndividual(ws.raw, {
									type: "ERROR",
									data: { message: "Need orgId+channel" },
								});
							}
							// ✅ enforce session: only allow "public" channel if unauthenticated
							if (!session && channel !== "public") {
								return broadcastIndividual(ws.raw, {
									type: "ERROR",
									data: { message: "Auth required for private channels" },
								});
							} else if (channel === "public" && !session) {
								handleSubscribe(ws.raw, wsClient.id, crypto.randomUUID(), orgId, channel);
							} else {
								const organization = await getOrganization(orgId, user.id);
								if (organization) {
									handleSubscribe(ws.raw, wsClient.id, user.id, orgId, channel);
								} else {
									broadcastIndividual(ws.raw, {
										type: "ERROR",
										data: { message: `You do not have access to this organization` },
									});
									ws.close();
								}
							}
							return;
						}
						return;
					case "UNSUBSCRIBE":
						if (!session) {
							return broadcastIndividual(ws.raw, {
								type: "ERROR",
								data: { message: "Anonymous users cannot unsubscribe" },
							});
						}
						joinWaitingRoom(ws.raw, wsClient.id, user?.id);
						return;
					case "MESSAGE":
						console.log(msg);
						return;
					default:
						joinWaitingRoom(ws.raw, wsClient.id, user?.id);
						break;
				}
			} catch (err) {
				broadcastIndividual(ws.raw, {
					type: "ERROR",
					data: { error: err instanceof Error ? err.message : String(err) },
				});
			}
		},

		onClose: (_, ws) => {
			broadcastIndividual(ws.raw, {
				type: "DISCONNECTED",
				data: { message: "You have been disconnected" },
			});
			unsubscribe(ws.raw);
			wsClients.delete(ws.raw);
			console.log("Connection closed");
		},
		onError(_, ws) {
			unsubscribe(ws.raw);
			wsClients.delete(ws.raw);
			ws.close();
			console.log("Connection closed error");
		},
	}))
);

// ✅ Heartbeat interval
// Send a PING every 30 seconds
// Close dead sockets after 60 seconds of no PONG
setInterval(() => {
	const now = Date.now();
	for (const [socket, wsClient] of wsClients) {
		if (now - wsClient.lastPong > 60_000) {
			console.log("Closing dead socket", wsClient);
			socket.close();
			unsubscribe(socket);
		} else {
			try {
				socket.send(JSON.stringify({ type: "PING", scope: "INDIVIDUAL", meta: { ts: Date.now() } }));
			} catch {
				console.log("Failed to ping, closing", wsClient);
				socket.close();
				unsubscribe(socket);
			}
		}
	}
}, 30_000);

// ✅ Admin broadcast of connections snapshot
// Every 90 seconds, send a snapshot of all connected clients
// This allows admin UIs to get a real-time view of connected clients
setInterval(() => {
	const snapshot = getAllConnectedClients();
	broadcast(ADMIN_ORG, CONNECTIONS_CHANNEL, {
		type: "CONNECTIONS_SNAPSHOT",
		data: snapshot,
		meta: { ts: Date.now() },
	});
}, 90_000);

if (process.env.npm_lifecycle_event === "dev") {
	console.log("WS stats every 60 seconds (dev mode)");

	// Connections / rooms overview
	setInterval(() => {
		const roomCount = rooms.size;
		let totalMembers = 0;
		let largest = "";
		let max = 0;
		for (const [name, set] of rooms) {
			totalMembers += set.size;
			if (set.size > max) {
				max = set.size;
				largest = name;
			}
		}
		const avg = roomCount ? (totalMembers / roomCount).toFixed(1) : 0;

		console.log(`
[WS Stats @ ${new Date().toISOString()}]
  Sockets:     ${wsClients.size}
  Rooms:       ${roomCount}
  Avg/room:    ${avg}
  Largest room:${largest || "n/a"} (${max})
`);
	}, 60_000);

	// Show heap usage
	setInterval(() => {
		const m = process.memoryUsage();
		console.log(
			`[Memory] rss=${(m.rss / 1_048_576).toFixed(1)} MB, heapUsed=${(m.heapUsed / 1_048_576).toFixed(1)} MB`
		);
	}, 60_000);
}

process.on("SIGTERM", () => {
	console.log("Closing all sockets for graceful shutdown...");
	for (const ws of wsClients.keys()) {
		try {
			ws.close();
		} catch {}
	}
	process.exit(0);
});
