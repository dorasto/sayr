import { context, trace, SpanStatusCode, type SpanContext, TraceFlags } from "@opentelemetry/api";
import { BasicTracerProvider, BatchSpanProcessor, type SpanExporter } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

let tracer: ReturnType<typeof trace.getTracer>;

export function initTracing(serviceName: string) {
	process.env.OTEL_SERVICE_NAME = serviceName;

	const domain = process.env.AXIOM_BACKEND_OTEL_DOMAIN || "api.axiom.co";
	const token = process.env.AXIOM_BACKEND_OTEL_TOKEN;
	const dataset = process.env.AXIOM_BACKEND_OTEL_DATASET;

	if (!token || !dataset) {
		console.warn("⚠️ Missing AXIOM_BACKEND_OTEL_TOKEN or AXIOM_BACKEND_OTEL_DATASET");
	}

	const exporterUrl = `https://${domain}/v1/traces`;

	const exporter = new OTLPTraceExporter({
		url: exporterUrl,
		headers: {
			Authorization: `Bearer ${token}`,
			"X-Axiom-Dataset": dataset || "",
		},
	}) as SpanExporter;

	const provider = new BasicTracerProvider({
		spanProcessors: [new BatchSpanProcessor(exporter)],
	});

	trace.setGlobalTracerProvider(provider);
	tracer = trace.getTracer(serviceName);

	console.log(`📡 Tracing initialized for "${serviceName}"`);
}

export function getTracer() {
	if (!tracer) {
		throw new Error("Tracing not initialized. Call initTracing() first.");
	}
	return tracer;
}

type TraceContext = {
	traceId?: string;
	spanId?: string;
	traceFlags?: number;
};

export async function withTraceContext<T>(
	traceContext: TraceContext | undefined,
	spanName: string,
	fn: () => Promise<T>
): Promise<T> {
	const t = getTracer();

	if (traceContext?.traceId && traceContext?.spanId) {
		const parentSpanContext: SpanContext = {
			traceId: traceContext.traceId,
			spanId: traceContext.spanId,
			traceFlags: traceContext.traceFlags ?? TraceFlags.SAMPLED,
			isRemote: true,
		};

		const parentContext = trace.setSpanContext(context.active(), parentSpanContext);

		return context.with(parentContext, async () => {
			const span = t.startSpan(spanName);
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

	const span = t.startSpan(spanName);
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

export async function traceAsync<T>(
	name: string,
	fn: () => Promise<T>,
	options?: {
		description?: string;
		data?: Record<string, unknown>;
		onSuccess?: (result: T) => { data?: Record<string, unknown>; outcome?: string };
	}
): Promise<T> {
	const tracer = getTracer();
	const parentCtx = context.active();
	const span = tracer.startSpan(name, undefined, parentCtx);

	if (options?.description) span.setAttribute("description", options.description);
	if (options?.data) span.setAttribute("data", JSON.stringify(options.data));

	try {
		const result = await fn();

		if (options?.onSuccess) {
			const extra = options.onSuccess(result);
			if (extra.data) {
				span.setAttribute("data", JSON.stringify({ ...(options?.data ?? {}), ...extra.data }));
			}
			if (extra.outcome) span.setAttribute("outcome", extra.outcome);
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
}
