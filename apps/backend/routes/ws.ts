import type { auth } from "@repo/auth";
import type { ServerWebSocket } from "bun";
import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";

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

const rooms = new Map<string, ClientInfo[]>(); // `${orgId}:${channel}`
const wsClientIds = new Map<ServerWebSocket, string>();

// 🔹 Internal helper to send to a list of clients
function sendToClients(clients: ClientInfo[] = [], message: object, exclude?: ServerWebSocket) {
	for (const c of clients) {
		if (exclude && c.socket === exclude) continue;
		try {
			c.socket.send(JSON.stringify(message));
		} catch (err) {
			console.error("Send failed", c.wsClientId, err);
		}
	}
}

// 🔹 General broadcast (room + firehose)
function broadcast(orgId: string, channel: string, message: object, exclude?: ServerWebSocket) {
	// Send to the specific channel
	sendToClients(rooms.get(`${orgId}:${channel}`), message, exclude);

	// Send to firehose listeners, but include channel info
	const firehoseMsg = {
		type: "FIREHOSE",
		data: {
			channel,
			payload: message,
		},
	};
	sendToClients(rooms.get(`${orgId}:*`), firehoseMsg, exclude);
}

// 🔹 Public broadcast (per org)
function broadcastPublic(orgId: string, message: object, exclude?: ServerWebSocket) {
	// Send to the org's public channel
	sendToClients(rooms.get(`${orgId}:public`), message, exclude);

	// Send to firehose listeners, include channel info
	const firehoseMsg = {
		type: "FIREHOSE",
		data: {
			channel: "public",
			payload: message,
		},
	};
	sendToClients(rooms.get(`${orgId}:*`), firehoseMsg, exclude);
}

// 🔹 Unsubscribe client from all rooms
function unsubscribe(socket: ServerWebSocket) {
	const wsClientId = wsClientIds.get(socket);
	for (const [key, clients] of rooms) {
		const filtered = clients.filter((c) => c.socket !== socket);
		if (filtered.length < clients.length) {
			const [orgId, channel] = key.split(":");
			broadcast(orgId as string, channel as string, {
				type: "USER_UNSUBSCRIBED",
				data: { wsClientId, orgId, channel },
			});
		}
		filtered.length ? rooms.set(key, filtered) : rooms.delete(key);
	}
}

// 🔹 Find client subscription
function findClient(socket: ServerWebSocket) {
	for (const clients of rooms.values()) {
		const found = clients.find((c) => c.socket === socket);
		if (found) return found;
	}
}

// 🔹 Handle subscription
function handleSubscribe(ws: ServerWebSocket, wsClientId: string, clientId: string, orgId: string, channel: string) {
	const key = `${orgId}:${channel}`;
	if ((rooms.get(key) || []).some((c) => c.socket === ws)) {
		ws.send(
			JSON.stringify({
				type: "ERROR",
				data: { message: `Already subscribed to ${orgId}:${channel}` },
			})
		);
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
	ws.send(
		JSON.stringify({
			type: "SUBSCRIBED",
			data: {
				wsClientId,
				clientId: info.clientId,
				orgId,
				channel,
			},
		})
	);
	broadcast(
		orgId,
		channel,
		{ type: "USER_SUBSCRIBED", data: { wsClientId, clientId: info.clientId, orgId, channel } },
		ws
	);
}

wsRoute.get(
	"/ws",
	upgradeWebSocket((c) => ({
		onOpen: (_, ws) => {
			const session = c.get("session");
			const wsClientId = crypto.randomUUID();
			wsClientIds.set(ws.raw, wsClientId);

			if (!session) {
				// unauthenticated → join org’s public channel
				const orgId = c.req.query("orgId") || "default"; // orgId must come from query param
				handleSubscribe(ws.raw, wsClientId, crypto.randomUUID(), orgId, "public");
				return;
			}

			ws.send(
				JSON.stringify({
					type: "SERVER_MESSAGE",
					data: { status: "Connected", wsClientId },
				})
			);
		},

		onMessage: (event, ws) => {
			try {
				const msg = JSON.parse(event.data as string);
				const wsClientId = wsClientIds.get(ws.raw) as string;
				const session = c.get("session"); // ✅ check session on every message
				const user = c.get("user");
				// ✅ Handle PONG
				if (msg.type === "PONG") {
					const client = findClient(ws.raw);
					if (client) client.lastPong = Date.now();
					return;
				}
				if (msg.type === "SUBSCRIBE") {
					const { orgId, channel } = msg;
					if (!orgId || !channel) {
						return ws.send(
							JSON.stringify({
								type: "ERROR",
								data: { message: "Need orgId+channel" },
							})
						);
					}

					// ✅ enforce session: only allow "public" channel if unauthenticated
					if (!session && channel !== "public") {
						return ws.send(
							JSON.stringify({
								type: "ERROR",
								data: { message: "Auth required for private channels" },
							})
						);
					} else if (channel === "public" && !session) {
						handleSubscribe(ws.raw, wsClientId, crypto.randomUUID(), orgId, channel);
					} else {
						handleSubscribe(ws.raw, wsClientId, user.id, orgId, channel);
					}
				}

				if (msg.type === "MESSAGE") {
					const client = findClient(ws.raw);
					if (!client) {
						return ws.send(
							JSON.stringify({
								type: "ERROR",
								data: { message: "Must SUBSCRIBE before MESSAGE" },
							})
						);
					}
					if (!msg.text) {
						return ws.send(
							JSON.stringify({
								type: "ERROR",
								data: { message: "MESSAGE requires text" },
							})
						);
					}

					// ✅ enforce session: only allow MESSAGE in public if unauthenticated
					if (!session && client.channel !== "public") {
						return ws.send(
							JSON.stringify({
								type: "ERROR",
								data: { message: "Auth required to send to private channels" },
							})
						);
					}

					if (client.channel === "public") {
						if (session) {
							broadcastPublic(
								client.orgId,
								{
									type: "MESSAGE",
									data: {
										text: msg.text,
										wsClientId,
										clientId: client.clientId,
										timestamp: new Date().toISOString(),
									},
								},
								ws.raw
							);
						}
					} else {
						broadcast(
							client.orgId,
							client.channel,
							{
								type: "MESSAGE",
								data: {
									text: msg.text,
									wsClientId,
									clientId: client.clientId,
									timestamp: new Date().toISOString(),
								},
							},
							ws.raw
						);
					}
				}
			} catch (err) {
				ws.send(
					JSON.stringify({
						type: "ERROR",
						data: { error: err instanceof Error ? err.message : String(err) },
					})
				);
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
