import type { ServerWebSocket } from "bun";

export type ClientInfo = {
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
		| "UPDATE_LABELS"
		| "FIREHOSE"
		| "CONNECTIONS_SNAPSHOT"
		| "WAITING_ROOM"
		| "DISCONNECTED"
		| "UPDATE_VIEWS"
		| "UPDATE_CATEGORIES"
		| "UPDATE_ISSUE_TEMPLATES"
		| "MEMBER_ACTIONS"
		| "NEW_NOTIFICATION"
		| "NOTIFICATION_READ";
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

export type wsClientsType = {
	id: string;
	connectedAt: number; // ✅ when this connection was first established
	lastMessageAt: number;
	offenceCount: number;
	// Heartbeat info
	lastPong: number; // ✅ last pong received from heartbeat
	lastPing: number; // ✅ last ping sent for heartbeat
	lastLatency: number; // ✅ last measured RTT
	pingTimer?: ReturnType<typeof setTimeout>; // ✅ per-client ping timer handle
};
