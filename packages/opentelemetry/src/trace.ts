import { type Attributes, AttributeValue, context, type SpanContext, SpanKind, SpanStatusCode, trace, TraceFlags } from "@opentelemetry/api";
import { getTracer } from ".";

export function getTraceContext() {
	const span = trace.getSpan(context.active());
	if (!span) return undefined;

	const spanContext = span.spanContext();
	return {
		traceId: spanContext.traceId,
		spanId: spanContext.spanId,
		traceFlags: spanContext.traceFlags,
	};
}

export type TraceAsync = <T>(
	name: string,
	fn: () => Promise<T>,
	options?: {
		description?: string;
		data?: Record<string, unknown>;
		onSuccess?: (result: T) => {
			data?: Record<string, unknown>;
			/**
			 * @deprecated Use `outcome` instead
			 */
			description?: string;
			outcome?: string;
		};
	}
) => Promise<T>;

function setSafeAttribute(
	span: { setAttribute: (k: string, v: AttributeValue) => void },
	key: string,
	value: unknown
) {
	if (
		value === undefined ||
		value === null
	) {
		return;
	}

	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		span.setAttribute(key, value);
		return;
	}

	if (Array.isArray(value)) {
		const arr = value.filter(
			(v): v is string | number | boolean =>
				typeof v === "string" ||
				typeof v === "number" ||
				typeof v === "boolean"
		);

		if (arr.length > 0) {
			// Convert to string array to satisfy AttributeValue array typing
			span.setAttribute(key, arr.map((v) => String(v)));
		}
		return;
	}

	// Fallback: stringify objects
	span.setAttribute(key, JSON.stringify(value));
}

/**
 * Creates an async tracing helper that wraps an operation in an OpenTelemetry
 * span. The returned function starts a span, runs the provided async callback,
 * attaches optional metadata, and records success or failure details.
 *
 * @example
 * const traceAsync = createTraceAsync();
 *
 * // Example: wrapping a fake user-processing operation
 * const result = await traceAsync(
 *   "user.process",
 *   async () => {
 *     // Simulate database work
 *     await new Promise((r) => setTimeout(r, 100));
 *
 *     const users = ["alice", "bob", "charlie"];
 *     const processed = users.map((u) => u.toUpperCase());
 *
 *     return { processed, count: processed.length };
 *   },
 *   {
 *     description: "Processing user records",
 *     data: { source: "demo", batchSize: 3 },
 *     onSuccess: (result) => ({
 *       outcome: "processed_successfully",
 *       data: { processedCount: result.count },
 *     }),
 *   }
 * );
 *
 * console.log(result);
 * // {
 * //   processed: ["ALICE", "BOB", "CHARLIE"],
 * //   count: 3
 * // }
 */
export function createTraceAsync(): TraceAsync {
	const tracer = getTracer();

	return async <T>(
		name: string,
		fn: () => Promise<T>,
		options?: {
			description?: string;
			data?: Record<string, unknown>;
			onSuccess?: (result: T) => {
				data?: Record<string, unknown>;
				/**
				 * @deprecated Use `outcome` instead
				 */
				description?: string;
				outcome?: string;
			};
		}
	): Promise<T> => {
		// ✅ Capture active context at execution time
		const parentCtx = context.active();

		const span = tracer.startSpan(
			name,
			{ kind: SpanKind.INTERNAL },
			parentCtx
		);

		// ✅ Set structured attributes
		if (options?.description) {
			span.setAttribute("trace.description", options.description);
		}

		if (options?.data) {
			for (const [key, value] of Object.entries(options.data)) {
				setSafeAttribute(span, `trace.data.${key}`, value);
			}
		}

		try {
			const result = await context.with(
				trace.setSpan(parentCtx, span),
				fn
			);

			if (options?.onSuccess) {
				const extra = options.onSuccess(result);

				if (extra.data) {
					for (const [key, value] of Object.entries(extra.data)) {
						setSafeAttribute(span, `trace.result.${key}`, value);
					}
				}

				const outcome =
					extra.outcome ?? extra.description;
				if (outcome) {
					span.setAttribute("trace.outcome", outcome);
				}
			}

			span.setStatus({ code: SpanStatusCode.OK });
			return result;
		} catch (err) {
			span.setAttribute("trace.outcome", "failed");
			span.recordException(err as Error);
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: (err as Error).message,
			});
			throw err;
		} finally {
			span.end();
		}
	};
}

export function maskEmail(email: string): string {
	const [local, domain] = email.split('@')
	if (!domain) return '***'
	const [domainName, tld] = domain.split('.')
	return `${local?.[0]}***@${domainName?.[0]}***.${tld}`
}

/** ------------------------------------------------------------
 *  Link async work to an existing upstream trace
 * ----------------------------------------------------------- */
export async function withTraceContext<T>(
	traceContext:
		| {
			traceId?: string;
			spanId?: string;
			traceFlags?: number;
		}
		| undefined,
	spanName: string,
	fn: () => Promise<T>
): Promise<T> {
	const tracer = getTracer();

	// Re‑establish parent trace if metadata provided
	if (traceContext?.traceId && traceContext?.spanId) {
		const parentSpan: SpanContext = {
			traceId: traceContext.traceId,
			spanId: traceContext.spanId,
			traceFlags: traceContext.traceFlags ?? TraceFlags.SAMPLED,
			isRemote: true,
		};

		const parentCtx = trace.setSpanContext(context.active(), parentSpan);

		return context.with(parentCtx, async () => {
			const span = tracer.startSpan(spanName);
			try {
				const result = await fn();
				span.setStatus({ code: SpanStatusCode.OK });
				return result;
			} catch (err) {
				span.recordException(err as Error);
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: (err as Error).message,
				});
				throw err;
			} finally {
				span.end();
			}
		});
	}

	// Otherwise, start a new root span
	const span = tracer.startSpan(spanName);
	return context.with(trace.setSpan(context.active(), span), async () => {
		try {
			const result = await fn();
			span.setStatus({ code: SpanStatusCode.OK });
			return result;
		} catch (err) {
			span.recordException(err as Error);
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: (err as Error).message,
			});
			throw err;
		} finally {
			span.end();
		}
	});
}
