"use client";

import { schema } from "@repo/database";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { useEffect, useRef, useState } from "react";

const API_URL =
    import.meta.env.VITE_APP_ENV === "development" ? "/backend-api" : "/api";

type SSEParams = {
    orgId?: string;
    channel?: string;
};

const useServerEvents = (initialOrgId?: string, initialChannel?: string) => {
    const [sse, setSse] = useState<EventSource | null>(null);
    const [params, setParams] = useState<SSEParams>({
        orgId: initialOrgId,
        channel: initialChannel,
    });

    const sseRef = useRef<EventSource | null>(null);

    const { setValue: setStatus } = useStateManagement<string>(
        "sse-status",
        "Disconnected"
    );

    const { setValue: setClientId } = useStateManagement<string>(
        "sse-clientId",
        ""
    );

    const disconnectTimeRef = useRef<number | null>(null);
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
    const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

    const connect = (orgId?: string, channel?: string) => {
        setParams({ orgId, channel });
    };

    const disconnect = () => {
        sseRef.current?.close();
        sseRef.current = null;
        setSse(null);
        setStatus("Disconnected");
    };

    useEffect(() => {
        const { orgId, channel } = params;

        const connectInternal = () => {
            if (sseRef.current) {
                sseRef.current.close();
                sseRef.current = null;
            }

            setStatus("Connecting");

            const url = (orgId || channel) ? `${API_URL}/events?orgId=${encodeURIComponent(
                orgId || ""
            )}&channel=${encodeURIComponent(channel || "public")}` : `${API_URL}/events`;

            const source = new EventSource(url);
            sseRef.current = source;

            source.onopen = () => {
                if (toastTimerRef.current) {
                    clearTimeout(toastTimerRef.current);
                    toastTimerRef.current = null;
                }

                setSse(source);
                setStatus("Connected");
            };

            source.onmessage = (event) => {
                try {
                    const data: ServerEventMessage = JSON.parse(event.data);

                    switch (data.type) {
                        case "CONNECTION_STATUS": {
                            if (data.data.authenticated) {
                                setStatus("Connected");
                                setClientId(data.data.clientId);

                                headlessToast.dismiss("sse-connection-status");

                                if (disconnectTimeRef.current !== null) {
                                    if (reconnectTimerRef.current)
                                        clearTimeout(reconnectTimerRef.current);

                                    reconnectTimerRef.current = setTimeout(() => {
                                        sendWindowMessage(
                                            window,
                                            { type: "SSE_RECONNECTED" },
                                            "*"
                                        );
                                        disconnectTimeRef.current = null;
                                    }, 2000);
                                }
                            } else {
                                disconnect();
                                setStatus("Reconnecting");

                                headlessToast.error({
                                    id: "sse-connection-status",
                                    title: "Connection failure",
                                    description:
                                        "There appears to be a connection problem.",
                                    action: {
                                        label: "Reload",
                                        onClick: () => location.reload(),
                                    },
                                    duration: Infinity,
                                });
                            }
                            return;
                        }

                        case "MEMBER_ACTIONS":
                            if (data.data.action === "REMOVED") {
                                headlessToast.info({
                                    id: "org-member-removed",
                                    title: "Removed from organization",
                                    description:
                                        "You have been removed from the organization. Redirecting...",
                                });

                                setTimeout(() => (window.location.href = "/"));
                            }
                            return;

                        default:
                            return;
                    }
                } catch { }
            };

            source.onerror = () => {
                source.close();
                sseRef.current = null;

                if (!disconnectTimeRef.current) {
                    disconnectTimeRef.current = Date.now();
                }

                setSse(null);
                setClientId("");
                setStatus("Reconnecting");

                if (!toastTimerRef.current) {
                    toastTimerRef.current = setTimeout(() => {
                        toastTimerRef.current = null;

                        headlessToast.error({
                            id: "sse-connection-status",
                            title: "Connection failure",
                            description:
                                "There appears to be a connection problem.",
                            duration: Infinity,
                            action: {
                                label: "Reload",
                                onClick: () => location.reload(),
                            },
                        });
                    }, 5000);
                }
            };
        };

        const timeout = setTimeout(connectInternal, 100);

        window.addEventListener("online", connectInternal);

        return () => {
            clearTimeout(timeout);

            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

            window.removeEventListener("online", connectInternal);

            sseRef.current?.close();
        };
    }, [params]);

    return {
        event: sse,
        connect,
        disconnect,
    };
};

export default useServerEvents;

// Base message type with optional metadata
export type BaseMessage = {
    scope: "INDIVIDUAL" | "CHANNEL" | "PUBLIC";
    meta?: {
        ts: number; // timestamp
        channel?: string;
        orgId?: string;
    };
};

export type ServerEventMessage =
    | (BaseMessage & {
        type: "CONNECTION_STATUS";
        data: { status: string; authenticated: boolean; clientId: string };
    })
    | (BaseMessage & {
        type: "SERVER_MESSAGE" | "ERROR";
        data: { message: string };
    })
    | (BaseMessage & {
        type: "PING" | "PONG";
    })
    | (BaseMessage & {
        type: "MESSAGE";
        data: {
            channel?: string;
            text?: string;
        };
    })
    | (BaseMessage & {
        type: "SUBSCRIBED";
        data: {
            orgId: string;
            channel: string;
        };
    })
    | (BaseMessage & {
        type: "UPDATE_ORG";
        data: schema.organizationType;
    })
    | (BaseMessage & {
        type: "UPDATE_CATEGORIES";
        data: schema.categoryType[];
    })
    | (BaseMessage & {
        type: "UPDATE_LABELS";
        data: schema.labelType[];
    })
    | (BaseMessage & {
        type: "UPDATE_VIEWS";
        data: schema.savedViewType[];
    })
    | (BaseMessage & {
        type: "UPDATE_ISSUE_TEMPLATES";
        data: schema.issueTemplateWithRelations[];
    })
    | (BaseMessage & {
        type: "UPDATE_RELEASES";
        data: schema.releaseType[];
    })
    | (BaseMessage & {
        type: "DELETE_RELEASE";
        data: { releaseId: string };
    })
    | (BaseMessage & {
        type: "CREATE_TASK";
        data: schema.TaskWithLabels;
    })
    | (BaseMessage & {
        type: "UPDATE_TASK";
        data: schema.TaskWithLabels;
    })
    | (BaseMessage & {
        type: "UPDATE_TASK_VOTE";
        data: {
            id: schema.TaskWithLabels["id"];
            voteCount: schema.TaskWithLabels["voteCount"];
        };
    })
    | (BaseMessage & {
        type: "UPDATE_TASK_COMMENTS";
        data: {
            id: string;
        };
    })
    | (BaseMessage & {
        type: "MEMBER_ACTIONS";
        data: { action: "ADDED" | "REMOVED"; orgId: string; userId: string };
    })
    | (BaseMessage & {
        type: "NEW_NOTIFICATION";
        data: schema.NotificationWithDetails;
    })
    | (BaseMessage & {
        type: "NOTIFICATION_READ";
        data: { id?: string; all?: boolean; organizationId?: string };
    });