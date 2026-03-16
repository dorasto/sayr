import { Hono } from "hono";
import { safeGetSession } from "@/getSession";
import { safeGetOrganization } from "@/util";

export const sseRoute = new Hono();

type SSEClient = {
    id: string;
    orgId: string;
    channel: string;
    send: (msg: unknown) => void;
    close: () => void;
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

export function sseBroadcast(orgId: string, channel: string, message: unknown, excludeId?: string) {
    const key = `${orgId}:${channel}`;
    const clients = sseRooms.get(key);

    if (!clients) return;

    for (const client of [...clients]) {
        if (excludeId && client.id === excludeId) continue;

        try {
            client.send(message);
        } catch {
            client.close();
            clients.delete(client);
            clientsById.delete(client.id);
        }
    }

    if (clients.size === 0) sseRooms.delete(key);
}

export function sseBroadcastPublic(orgId: string, message: Omit<any, "scope">, excludeId?: string) {
    const fullMsg = { ...message, scope: "PUBLIC" };
    sseBroadcast(orgId, "public", fullMsg, excludeId);
    const key = `${orgId}:public`;
    const clients = sseRooms.get(key);

    if (!clients) return;

    for (const client of [...clients]) {
        if (excludeId && client.id === excludeId) continue;

        try {
            client.send(message);
        } catch {
            client.close();
            clients.delete(client);
            clientsById.delete(client.id);
        }
    }

    if (clients.size === 0) sseRooms.delete(key);
}

sseRoute.get("/", async (c) => {
    let orgId = c.req.query("orgId");
    let channel = c.req.query("channel");
    const clientId = crypto.randomUUID();

    const session = await safeGetSession(c.req.raw.headers);

    // Determine authentication
    let authenticated = false;

    if (!channel || channel === "public") {
        // public channel allowed for everyone
        channel = "public";
        authenticated = !!session?.session; // authenticated if user logged in
    } else if (orgId) {
        // Non-public channel → must be a valid org and user member
        const org = await safeGetOrganization(orgId, session?.user.id || "");
        if (!org) {
            // block connection
            return new Response(JSON.stringify({ error: "Unauthorized or org does not exist" }), { status: 403 });
        }
        authenticated = true;
    } else {
        // no org provided for non-public channel → block
        return new Response(JSON.stringify({ error: "Organization required for this channel" }), { status: 400 });
    }

    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(`retry: 2000\n\n`);

            const send = (msg: unknown) => {
                controller.enqueue(`data: ${JSON.stringify(msg)}\n\n`);
            };

            let heartbeat: NodeJS.Timeout;

            const close = () => {
                console.log("close", client)
                clearInterval(heartbeat);
                try {
                    controller.close();
                } catch { }
                sseUnsubscribe(client);
            };

            const client: SSEClient = { id: clientId, orgId: orgId || "public", channel, send, close };

            const key = `${orgId || "public"}:${channel}`;
            console.log("🚀 ~ key:", key)
            if (!sseRooms.has(key)) sseRooms.set(key, new Set());
            sseRooms.get(key)!.add(client);
            clientsById.set(clientId, client);

            // heartbeat ping
            heartbeat = setInterval(() => {
                try {
                    controller.enqueue(": ping\n\n");
                } catch {
                    close();
                }
            }, 25000);

            c.req.raw.signal.addEventListener("abort", () => close());

            send({
                type: "CONNECTION_STATUS",
                data: {
                    status: "connected",
                    authenticated,
                    wsClientId: clientId,
                },
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

// testing broadcast
sseRoute.post("/broadcast", async (c) => {
    const { orgId, channel, message } = await c.req.json();
    sseBroadcast(orgId, channel, message);
    return c.json({ ok: true });
});

export default sseRoute;