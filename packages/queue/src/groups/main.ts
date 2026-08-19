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
	  };
