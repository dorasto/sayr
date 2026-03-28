import { Hono } from "hono";
import { safeGetSession } from "@/getSession";
import { safeGetOrganization } from "@/util";
import { ServerEventBaseMessage } from "./types";
import { auth as authSchema, db } from "@repo/database";
import { inArray } from "drizzle-orm";
import { ensureCdnUrl } from "@repo/util";

export const sseRoute = new Hono();

type SSEClient = {
    id: string; // unique connection ID
    orgId: string;
    channel: string;
    send: (msg: unknown) => void;
    close: () => void;

    clientId: string; // logical user ID (can have multiple connections)
    authenticated: boolean;
    connectedAt: number; // timestamp (Date.now())
    device: string;

    // Added fields
    ref?: string;
};

const sseRooms = new Map<string, Set<SSEClient>>();
const clientsById = new Map<string, SSEClient>();

export function findClientBysseId(id: string): SSEClient | undefined {
    return clientsById.get(id);
}

function sseUnsubscribe(client: SSEClient) {
    const key = `${client.orgId}:${client.channel}`;
    const room = sseRooms.get(key);

    if (!room) return;

    room.delete(client);
    clientsById.delete(client.id);

    if (room.size === 0) {
        sseRooms.delete(key);
    }
}

export function sseBroadcastToRoom(
    orgId: string,
    channel: string,
    message: unknown,
    excludeId?: string,
    includeParent = false
) {
    const seen = new Set<string>(); // track client.id
    const targets: SSEClient[] = [];

    // helper: add all clients in a room (if not already added)
    const addRoom = (roomKey?: string) => {
        if (!roomKey) return;

        const clients = sseRooms.get(`${orgId}:${roomKey}`);
        if (!clients) return;

        for (const client of clients) {
            if (excludeId && client.id === excludeId) continue;
            if (seen.has(client.id)) continue;
            seen.add(client.id);
            targets.push(client);
        }
    };

    const parts = channel.split(";");

    // add each nested room
    for (const part of parts) {
        addRoom(part);
    }

    // optionally add root parent
    if (includeParent && parts.length > 1) {
        addRoom(parts[0]);
    }

    // send to all collected clients
    const ts = Date.now();
    for (const client of targets) {
        try {
            const msg = typeof message === "object" && message !== null
                ? { ...message, meta: { ts, orgId, ...((message as any).meta || {}) } }
                : { data: message, meta: { ts, orgId } };
            client.send(msg);
        } catch {
            client.close();
            const room = sseRooms.get(`${orgId}:${client.channel}`);
            if (room) {
                room.delete(client);
                if (room.size === 0) sseRooms.delete(`${orgId}:${client.channel}`);
            }
        }
    }
}

export function sseBroadcastPublic(orgId: string, message: Omit<any, "scope" | "meta">, excludeId?: string) {
    const fullMsg = { ...message, scope: "PUBLIC" };
    sseBroadcastToRoom(orgId, "public", fullMsg, excludeId);
}

export function sseBroadcastByUserId(
    userId: string,
    excludeClientId: string,
    orgId: string,
    message: unknown,
    excludeChannel?: string,
) {
    const ts = Date.now();
    for (const client of clientsById.values()) {
        // must belong to that user
        if (client.clientId !== userId) continue;

        // skip excluded client
        if (client.id === excludeClientId) continue;

        // skip excluded channels
        if (client.channel === excludeChannel) continue;

        // skip public channel
        if (client.channel === "public") continue;

        try {
            const msg = typeof message === "object" && message !== null
                ? { ...message, meta: { ts, orgId, ...((message as any).meta || {}) }, scope: "INDIVIDUAL" }
                : { data: message, meta: { ts, orgId }, scope: "INDIVIDUAL" };
            client.send(msg);
        } catch {
            client.close();
        }
    }
}
export function sseBroadcastIndividual(
    client: SSEClient,
    message: Omit<ServerEventBaseMessage, "scope">,
    orgId?: string
) {
    if (!client) return;

    // Fast-path templates (optional, matching WS behavior)
    switch (message.type) {
        case "PING":
            client.send({ type: "PING", scope: "INDIVIDUAL" });
            return;
        case "DISCONNECTED":
            client.send({ type: "DISCONNECTED", scope: "INDIVIDUAL" });
            return;
        case "WAITING_ROOM":
            client.send({ type: "WAITING_ROOM", scope: "INDIVIDUAL" });
            return;
    }

    const ts = Date.now();

    // Fast-path for plain string data
    if (typeof message.data === "string") {
        const payload = {
            type: message.type,
            scope: "INDIVIDUAL",
            data: message.data,
            meta: { ts, orgId },
        };

        try {
            client.send(payload);
        } catch {
            client.close();
        }

        return;
    }

    // General path for object data
    const payload = {
        ...message,
        scope: "INDIVIDUAL",
        meta: { ts, orgId, ...(message.meta || {}) },
    };

    try {
        client.send(payload);
    } catch {
        client.close();
    }
}

export function findSSEClientsByUserId(userId: string): SSEClient[] {
    const results: SSEClient[] = [];

    for (const client of clientsById.values()) {
        if (client.clientId === userId) {
            results.push(client);
        }
    }

    return results;
}
function getDeviceType(userAgent: string | undefined): string {
    if (!userAgent) return "unknown";
    const ua = userAgent.toLowerCase();
    const isMobile =
        ua.includes("iphone") ||
        ua.includes("ipad") ||
        ua.includes("android") ||
        ua.includes("mobile");
    return isMobile ? "mobile" : "desktop";
}
sseRoute.get("/", async (c) => {
    let orgId = c.req.query("orgId");
    let channel = c.req.query("channel");
    let ref = c.req.query("ref");
    const userAgent = c.req.raw.headers.get("user-agent");
    const device = getDeviceType(userAgent || "");
    const id = crypto.randomUUID();

    const session = await safeGetSession(c.req.raw.headers);

    // Determine authentication
    const authenticated = !!session?.session;
    if (!channel || channel === "public") {
        // public channel allowed for everyone
        channel = "public";
    } else if (orgId) {
        // Non-public channel → must be a valid org and user member
        const org = await safeGetOrganization(orgId, session?.user.id || "");
        if (!org) {
            // block connection
            return c.json({ error: "Unauthorized or org does not exist" }, 403);
        }
    } else {
        // no org provided for non-public channel → block

        return c.json({ error: "Organization required for this channel" }, 400);
    }
    if (channel === "public" && !orgId && authenticated) {
        channel = "user";
    }

    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(`retry: 2000\n\n`);

            const send = (msg: unknown) => {
                controller.enqueue(`data: ${JSON.stringify(msg)}\n\n`);
            };

            let heartbeat: NodeJS.Timeout;

            const close = () => {
                clearInterval(heartbeat);
                try {
                    controller.close();
                } catch { }
                sseUnsubscribe(client);
            };

            const client: SSEClient = { id: id, orgId: orgId || "", channel, send, close, clientId: session?.user.id || "", authenticated, connectedAt: Date.now(), ref: ref, device: device };

            const key = `${orgId || ""}:${channel}`;
            if (!sseRooms.has(key)) sseRooms.set(key, new Set());
            sseRooms.get(key)!.add(client);
            clientsById.set(id, client);

            // heartbeat ping
            heartbeat = setInterval(() => {
                try {
                    controller.enqueue(": ping\n\n");
                } catch {
                    close();
                }
            }, 25000);

            c.req.raw.signal.addEventListener("abort", () => close());

            const ts = Date.now();
            send({
                type: "CONNECTION_STATUS",
                data: {
                    status: "connected",
                    authenticated,
                    clientId: id,
                },
                meta: { ts, orgId, channel },
            });
        },

        cancel() { },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
});

sseRoute.get("/connections", async (c) => {
    const session = await safeGetSession(c.req.raw.headers);

    if (!session?.session || !session?.user?.id) {
        return c.json({ error: "Unauthorized" }, 401);
    }
    if (session.user.role !== "admin") {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const userTable = authSchema.user;

    const snapshot: Array<{
        sseClientId: string;
        clientId: string;
        orgId: string;
        channel: string;
        connectedAt: number;
        authenticated: boolean;
        account?: {
            name: string;
            image: string;
            role: string;
        }
        device: string;
        ref?: string;
    }> = [];

    const clientIds = [...new Set([...clientsById.values()].map(c => c.clientId).filter(Boolean))];
    const usersById = new Map<string, { name: string; image: string; role: string }>();

    if (clientIds.length > 0) {
        const users = await db
            .select({
                id: userTable.id,
                name: userTable.name,
                image: userTable.image,
                role: userTable.role
            })
            .from(userTable)
            .where(inArray(userTable.id, clientIds));

        for (const user of users) {
            usersById.set(user.id, {
                name: user.name || user.id,
                image: ensureCdnUrl(user.image || "") || "",
                role: user.role || ""
            });
        }
    }

    for (const client of clientsById.values()) {
        const account = client.clientId ? usersById.get(client.clientId) : undefined;
        snapshot.push({
            sseClientId: client.id,
            clientId: client.clientId,
            orgId: client.orgId,
            channel: client.channel,
            connectedAt: client.connectedAt,
            authenticated: client.authenticated,
            account,
            device: client.device,
            ref: client.ref,
        });
    }

    return c.json({ success: true, data: snapshot });
});
export default sseRoute;