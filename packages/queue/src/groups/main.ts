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

/* ============================================================
   Discriminated Union
   ============================================================ */

export type MainJob = | {
    type: "gdpr_export";
    traceContext?: MainExportTraceContext;
    payload: GdprExportPayload;
};