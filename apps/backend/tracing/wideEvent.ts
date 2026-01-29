import { context, trace, SpanStatusCode, type Attributes, SpanKind } from "@opentelemetry/api";
import { getTracer } from "@repo/opentelemetry";
import type { Context, Next } from "hono";

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

export type RecordWideError = (wide: WideError) => Promise<void>;

/**
 * Middleware that attaches helpers:
 *  - recordWideError() → to record exceptions with error details
 */
export function wideEventMiddleware() {
	return async (c: Context, next: Next) => {
		const tracer = getTracer();

		c.set("recordWideError", async (wide: WideError) => {
			// ✅ capture context at execution time
			const parentCtx = context.active();
			const parentSpan = trace.getSpan(parentCtx);

			if (!parentSpan) {
				return;
			}

			const span = tracer.startSpan(
				wide.name ?? "error",
				{ kind: SpanKind.INTERNAL },
				parentCtx
			);

			try {
				const { error, message, code, contextData } = wide;

				span.setAttributes({
					"trace.error.type":
						(error as Error)?.name ?? typeof error,
					"trace.error.message":
						(error as Error)?.message ??
						message ??
						"Unknown error",
					"trace.error.code":
						code?.toString() ?? "Unknown",
				});

				if ((error as Error)?.stack) {
					span.setAttribute(
						"trace.error.stack",
						(error as Error).stack as string
					);
				}

				if (contextData) {
					for (const [key, value] of Object.entries(contextData)) {
						if (value !== undefined && value !== null) {
							span.setAttribute(
								`trace.error.context.${key}`,
								typeof value === "string" ||
									typeof value === "number" ||
									typeof value === "boolean"
									? value
									: JSON.stringify(value)
							);
						}
					}
				}

				span.recordException(error as Error);
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message:
						(error as Error)?.message ??
						message ??
						"Unknown error",
				});
			} catch (err) {
				span.recordException(err as Error);
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: "Failed to record error",
				});
			} finally {
				span.end();
			}
		});

		await next();
	};
}