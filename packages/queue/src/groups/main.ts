/* ============================================================
   Main Export Job Types
   ============================================================ */

export type MainExportTraceContext = {
	traceId?: string;
	spanId?: string;
	traceFlags?: number;
};

/* ============================================================
   Main Export Payload
   ============================================================ */

export type GdprExportPayload = {
	userId: string;
};

export type EmbedTaskPayload = {
	orgId: string;
	taskId: string;
};

/* ============================================================
   Discriminated Union
   ============================================================ */

export type MainJob =
	| {
		type: "gdpr_export";
		traceContext?: MainExportTraceContext;
		payload: GdprExportPayload;
	}
	| {
		type: "embed_task";
		traceContext?: MainExportTraceContext;
		payload: EmbedTaskPayload;
	}
	| {
		type: "notification_create";
		traceContext?: MainExportTraceContext;
		payload: {
			recipientId: string;
			actorId?: string | null;
			scopeType?: string | null;
			scopeId?: string | null;
			type: string;
			resourceType?: string | null;
			resourceId?: string | null;
			data: Record<string, unknown>;
		};
	};
