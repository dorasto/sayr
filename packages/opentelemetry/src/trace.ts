import {
	type Attributes,
	context,
	type SpanContext,
	SpanStatusCode,
	trace,
	TraceFlags,
} from "@opentelemetry/api";
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
	},
) => Promise<T>;

export function createTraceAsync(): TraceAsync {
	const tracer = getTracer();
	const parentCtx = context.active();

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
		},
	): Promise<T> => {
		const span = tracer.startSpan(name, undefined, parentCtx);

		const attrs: Attributes = {
			data: JSON.stringify(options?.data ?? {}),
		};
		if (options?.description) attrs.description = options.description;
		span.setAttributes(attrs);

		try {
			const result = await fn();

			if (options?.onSuccess) {
				const extra = options.onSuccess(result);
				if (extra.data) {
					span.setAttribute(
						"data",
						JSON.stringify({ ...(options?.data ?? {}), ...extra.data }),
					);
				}
				// Prefer outcome, fall back to deprecated description
				const outcomeValue = extra.outcome ?? extra.description;
				if (outcomeValue) {
					span.setAttribute("outcome", outcomeValue);
				}
			}

			span.setStatus({ code: SpanStatusCode.OK });
			return result;
		} catch (err) {
			span.setAttribute("outcome", "failed");
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
	fn: () => Promise<T>,
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
