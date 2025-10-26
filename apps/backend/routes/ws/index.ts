import type { ServerWebSocket } from "bun";
import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { safeGetSession } from "@/getSession";
import { safeGetOrganization } from "@/util";
import { DISCONNECTED_TEMPLATE, PING_TEMPLATE, WAITING_ROOM_TEMPLATE } from "./templates";
import type { ClientInfo, WSBaseMessage, wsClientsType } from "./types";

export const wsRoute = new Hono();

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
	// skip closed sockets
	if (!ws || ws.readyState !== 1) return;

	// Common frequent message optimisations
	switch (message.type) {
		case "PING":
			// already has a constant template if you want
			ws.send(PING_TEMPLATE);
			return;
		case "DISCONNECTED":
			ws.send(DISCONNECTED_TEMPLATE);
			return;
		case "WAITING_ROOM":
			ws.send(WAITING_ROOM_TEMPLATE);
			return;
	}

	// everything else: minimal object build + fast JSON encode
	// pre‑attach timestamp (cheap inline)
	const ts = Date.now();

	// Instead of copying the whole meta & message, build fast and reuse small string concat
	if (typeof message.data === "string") {
		// handle cheap string case
		ws.send(`{"type":"${message.type}","scope":"INDIVIDUAL","data":"${message.data}","meta":{"ts":${ts}}}`);
		return;
	}

	// fallback — JSON stringify for complex objects, but only once
	ws.send(
		JSON.stringify({
			...message,
			scope: "INDIVIDUAL",
			meta: { ts, ...(message.meta || {}) },
		})
	);
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
 * Searches through all active rooms and returns the first matching client
 * whose `wsClientId` matches the provided ID.
 *
 * @param wsClientId - The unique identifier assigned to the WebSocket client.
 * @returns The {@link ClientInfo} object if found, otherwise `undefined`.
 *
 * @example
 * ```ts
 * const client = findClientByWsId("abc123");
 * if (client) console.log("Found:", client.socket.data);
 * ```
 */
export function findClientByWsId(wsClientId: string): ClientInfo | undefined {
	for (const clients of rooms.values()) {
		for (const c of clients) {
			if (c.wsClientId === wsClientId) {
				return c;
			}
		}
	}
	return undefined;
}

/**
 * Find a connected WebSocket client by its raw WebSocket instance.
 *
 * This is useful when you have an active {@link ServerWebSocket} object and
 * want to look up the associated client information (for example, inside an
 * incoming message or close event).
 *
 * @param socket - The raw {@link ServerWebSocket} instance associated with the client.
 * @returns The {@link ClientInfo} object if found, otherwise `undefined`.
 *
 * @example
 * ```ts
 * server.ws("/ws", {
 *   message(ws, message) {
 *     const client = findClientBySocket(ws);
 *     if (client) console.log("Message from client:", client.wsClientId);
 *   }
 * });
 * ```
 */
export function findClientBySocket(socket: ServerWebSocket): ClientInfo | undefined {
	for (const clients of rooms.values()) {
		for (const c of clients) {
			if (c.socket === socket) {
				return c;
			}
		}
	}
	return undefined;
}

/**
 * Retrieves the connection metadata for a given {@link ServerWebSocket} instance.
 *
 * This provides access to connection lifecycle information such as
 * `connectedAt`, `lastMessageAt`, and heartbeat data (e.g. `lastPong`).
 *
 * @param socket - The raw {@link ServerWebSocket} instance associated with the client.
 * @returns The {@link wsClientsType} metadata object if found, otherwise `undefined`.
 *
 * @example
 * ```ts
 * const info = getWsClientMeta(ws);
 * if (info) {
 *   console.log(`Client ${info.id} pinged last at`, new Date(info.lastPong));
 * } else {
 *   console.warn("Unknown or expired websocket");
 * }
 * ```
 *
 * @remarks
 * This function safely wraps access to the global {@link wsClients} map and
 * guards against potential race conditions where a socket may have been
 * removed by a cleanup interval or disconnect event.
 */
export function getWsClientMeta(socket: ServerWebSocket): wsClientsType | undefined {
	const client = wsClients.get(socket);
	if (!client) {
		return undefined;
	}
	return client;
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
			const wsClientId = getWsClientMeta(c.socket);
			if (wsClientId) {
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
			} else {
				console.log("🚀 ~ getAllConnectedClients ~ wsClientId:", wsClientId);
			}
		}
	}

	return connected;
}

// ------------------------------------------------------------------
// Subscription Helpers
// ------------------------------------------------------------------

function unsubscribe(socket: ServerWebSocket) {
	const wsMeta = getWsClientMeta(socket);
	const id = wsMeta?.id ?? "unknown";

	for (const [roomKey, members] of rooms.entries()) {
		if (!members || members.size === 0) continue;
		const before = members.size;
		for (const member of members) {
			if (member.socket === socket) members.delete(member);
		}

		// if someone was removed
		if (members.size < before) {
			const [orgId, channel] = roomKey.split(":");

			// send unsub notice only for real orgs
			if (orgId && channel && orgId !== WAITING_ORG) {
				try {
					broadcast(orgId, channel, { type: "USER_UNSUBSCRIBED", data: { id, orgId, channel } }, socket);
				} catch (err) {
					console.warn("unsubscribe broadcast failed:", err);
				}
			}
			// delete empty non-waiting rooms
			if (members.size === 0) {
				rooms.delete(roomKey);
			}
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
	"/",
	upgradeWebSocket((c) => ({
		onOpen: async (_, ws) => {
			const sessionData = await safeGetSession(c.req.raw.headers);
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

			if (!sessionData) {
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
				handleSubscribe(ws.raw, wsClientId, sessionData.user.id, orgId, "public");
			}
		},

		onMessage: async (event, ws) => {
			try {
				const now = Date.now();
				const msg: WSBaseMessage = JSON.parse(event.data as string);
				const wsClient = getWsClientMeta(ws.raw);
				if (!wsClient) {
					console.warn("Unknown wsClient in onMessage");
					return;
				}
				const client = findClientBySocket(ws.raw);
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
							const sessionData = await safeGetSession(c.req.raw.headers);
							if (sessionData?.user.role !== "admin") {
								broadcastIndividual(ws.raw, {
									type: "ERROR",
									data: { message: "Unauthorized for CONNECTIONS_SNAPSHOT" },
									meta: { ts: now },
								});
								ws.close();
								return;
							}
							handleSubscribe(ws.raw, wsClient.id, sessionData?.user.id, ADMIN_ORG, CONNECTIONS_CHANNEL);
							// ✅ Send snapshot of connected clients to *this admin only*
							const snapshot = getAllConnectedClients();
							broadcastIndividual(ws.raw, {
								type: "CONNECTIONS_SNAPSHOT",
								data: snapshot,
							});
							return;
						}
						if (msg.type === "SUBSCRIBE") {
							const sessionData = await safeGetSession(c.req.raw.headers);
							const { orgId, channel } = msg;
							if (!orgId || !channel) {
								return broadcastIndividual(ws.raw, {
									type: "ERROR",
									data: { message: "Need orgId+channel" },
								});
							}
							// ✅ enforce session: only allow "public" channel if unauthenticated
							if (!sessionData?.session && channel !== "public") {
								return broadcastIndividual(ws.raw, {
									type: "ERROR",
									data: { message: "Auth required for private channels" },
								});
							} else if (channel === "public" && !sessionData?.session) {
								handleSubscribe(ws.raw, wsClient.id, crypto.randomUUID(), orgId, channel);
							} else {
								const organization = await safeGetOrganization(orgId, sessionData?.user.id || "");
								if (organization) {
									handleSubscribe(ws.raw, wsClient.id, sessionData?.user.id || "", orgId, channel);
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
					case "UNSUBSCRIBE": {
						const sessionData = await safeGetSession(c.req.raw.headers);
						if (!sessionData?.session) {
							return broadcastIndividual(ws.raw, {
								type: "ERROR",
								data: { message: "Anonymous users cannot unsubscribe" },
							});
						}
						joinWaitingRoom(ws.raw, wsClient.id, sessionData.user?.id);
						return;
					}
					case "CONNECTIONS_SNAPSHOT": {
						const sessionData = await safeGetSession(c.req.raw.headers);
						if (sessionData?.user.role !== "admin") {
							return;
						} else {
							// ✅ Send snapshot of connected clients to *this admin only*
							const snapshot = getAllConnectedClients();
							broadcastIndividual(ws.raw, {
								type: "CONNECTIONS_SNAPSHOT",
								data: snapshot,
							});
							return;
						}
					}
					case "MESSAGE":
						console.log(msg);
						return;
					default: {
						const sessionData = await safeGetSession(c.req.raw.headers);
						joinWaitingRoom(ws.raw, wsClient.id, sessionData?.user?.id || "");
						break;
					}
				}
			} catch (err) {
				broadcastIndividual(ws.raw, {
					type: "ERROR",
					data: { error: err instanceof Error ? err.message : String(err) },
				});
			}
		},

		onClose: (_, ws) => {
			broadcastIndividual(ws.raw, { type: "DISCONNECTED" });
			unsubscribe(ws.raw);
			wsClients.delete(ws.raw);
			console.log("Connection closed");
		},
		onError(_, ws) {
			unsubscribe(ws.raw);
			ws.close();
			wsClients.delete(ws.raw);
			console.log("Connection closed error");
		},
	}))
);

wsRoute.get("/health", (c) => c.json({ ok: true }));

wsRoute.get("/metrics", (c) => {
	return c.json({
		rooms: rooms.size,
		sockets: wsClients.size,
		memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
		uptimeMin: Math.round(process.uptime() / 60),
	});
});
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
				socket.send(`{"type":"PING","scope":"INDIVIDUAL","meta":{"ts":${Date.now()}}}`);
			} catch {
				console.log("Failed to ping, closing", wsClient);
				socket.close();
				unsubscribe(socket);
			}
		}
	}
}, 30_000);

process.on("SIGTERM", () => {
	console.log("Closing all sockets for graceful shutdown...");
	for (const ws of wsClients.keys()) {
		try {
			ws.close();
		} catch {}
	}
	process.exit(0);
});
