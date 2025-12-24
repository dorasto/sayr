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
	data: Record<string, unknown>; // your custom payload
}

export type RecordWideEvent = (wide: WideEvent) => Promise<void>;

/**
 * Middleware that attaches a helper to record a custom‑data span.
 * Requires rootSpanMiddleware (or another active OTel span) above it.
 */
export function wideEventMiddleware() {
	return async (c: Context, next: Next) => {
		c.set("recordWideEvent", async (wide: WideEvent) => {
			const tracer = getTracer();
			const parentCtx = context.active();
			const parentSpan = trace.getSpan(parentCtx);

			if (!parentSpan) {
				console.warn("No active span found; wide event ignored.");
				return;
			}
			const spanName = wide.name ?? "custom-data";
			const span = tracer.startSpan(spanName, undefined, parentCtx);
			try {
				// inside the middleware
				const attrs: Attributes = {
					custom: JSON.stringify(wide.data),
				};
				if (wide.description) attrs.description = wide.description;
				span.setAttributes(attrs);
				span.setStatus({ code: SpanStatusCode.OK });
			} catch (err) {
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: (err as Error).message,
				});
				span.recordException(err as Error);
			} finally {
				span.end();
			}
		});

		await next();
	};
}
