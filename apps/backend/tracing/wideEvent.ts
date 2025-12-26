import {
	context,
	trace,
	SpanStatusCode,
	type Attributes,
} from "@opentelemetry/api";
import type { Context, Next } from "hono";
import { getTracer } from "./index";

export interface WideEvent {
	name: string;
	description?: string;
	data: Record<string, unknown>;
}

export interface WideError {
	name: string;
	error: unknown;
	message?: string;
	code?: string | number;
	contextData?: Record<string, unknown>;
}

export type RecordWideEvent = (wide: WideEvent) => Promise<void>;
export type RecordWideError = (wide: WideError) => Promise<void>;

/**
 * Middleware that attaches helpers:
 *  - recordWideEvent() → to record general telemetry spans
 *  - recordWideError() → to record exceptions with error details
 */
export function wideEventMiddleware() {
	return async (c: Context, next: Next) => {
		const tracer = getTracer();
		const parentCtx = context.active();
		const parentSpan = trace.getSpan(parentCtx);

		if (!parentSpan) {
			console.warn("⚠️ No active span found; wide events will be ignored.");
		}

		// -- Event recorder --
		c.set("recordWideEvent", async (wide: WideEvent) => {
			if (!parentSpan) return;

			const span = tracer.startSpan(
				wide.name ?? "custom-event",
				undefined,
				parentCtx,
			);
			try {
				const attrs: Attributes = {
					data: JSON.stringify(wide.data ?? {}),
				};
				if (wide.description) attrs.description = wide.description;
				span.setAttributes(attrs);
				span.setStatus({ code: SpanStatusCode.OK });
			} catch (err) {
				span.recordException(err as Error);
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: (err as Error).message,
				});
			} finally {
				span.end();
			}
		});

		// -- Error recorder --
		c.set("recordWideError", async (wide: WideError) => {
			if (!parentSpan) return;

			const span = tracer.startSpan(wide.name ?? "error", undefined, parentCtx);
			try {
				const { error, message, code, contextData } = wide;

				const attrs: Attributes = {
					error_type: (error as Error)?.name ?? typeof error,
					error_message: (error as Error)?.message ?? String(message ?? ""),
					error_stack: (error as Error)?.stack ?? "⚠️ No stack available",
					error_code: code?.toString() ?? "Unknown",
					error_data: JSON.stringify(contextData ?? {}),
				};

				span.setAttributes(attrs);
				span.recordException(error as Error);
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: (error as Error)?.message ?? message ?? "Unknown error",
				});
			} catch (err) {
				console.error("recordWideError failed:", err);
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: `Error while recording error: ${(err as Error).message}`,
				});
				span.recordException(err as Error);
			} finally {
				span.end();
			}
		});

		await next();
	};
}
