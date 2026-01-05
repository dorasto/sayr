import { context, trace, SpanStatusCode, TraceFlags, type SpanContext } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

/* ------------------------------------------------------------ */

let globalTracer: ReturnType<typeof trace.getTracer> | undefined;
let globalSDK: NodeSDK | undefined;

/** ------------------------------------------------------------
 *  Initialize tracing once at worker startup
 * ----------------------------------------------------------- */
export async function initTracing(servicename: string) {
	const env = process.env.NODE_ENV || "development";
	const isProd = env === "production";
	const serviceName = `sayr-worker-${servicename}-${isProd ? "prod" : "dev"}`;

	const exporter = new OTLPTraceExporter({
		url: `https://${process.env.AXIOM_BACKEND_OTEL_DOMAIN}/v1/traces`,
		headers: {
			Authorization: `Bearer ${process.env.AXIOM_BACKEND_OTEL_TOKEN}`,
			"X-Axiom-Dataset": process.env.AXIOM_BACKEND_OTEL_DATASET || "",
		},
	});

	const sdk = new NodeSDK({
		serviceName,
		traceExporter: exporter,
	});

	await sdk.start();
	globalSDK = sdk;

	process.on("SIGTERM", () => sdk.shutdown());
	process.on("SIGINT", () => sdk.shutdown());

	globalTracer = trace.getTracer(serviceName);
	console.log(`✅ OpenTelemetry SDK started (${serviceName})`);
}

/** ------------------------------------------------------------
 *  Get a tracer that the NodeSDK registered globally
 * ----------------------------------------------------------- */
export function getTracer() {
	if (!globalTracer) {
		globalTracer = trace.getTracer("sayr-worker-uninitialized");
	}
	return globalTracer;
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
	const t = getTracer();

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

	// Otherwise, start a new root span
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

/** ------------------------------------------------------------
 *  Utility for simple traced async operations
 * ----------------------------------------------------------- */
export async function traceAsync<T>(
	name: string,
	fn: () => Promise<T>,
	opts?: {
		description?: string;
		data?: Record<string, unknown>;
		onSuccess?: (result: T) => { data?: Record<string, unknown>; outcome?: string };
	}
): Promise<T> {
	const t = getTracer();
	const parentCtx = context.active();
	const span = t.startSpan(name, undefined, parentCtx);

	if (opts?.description) span.setAttribute("description", opts.description);
	if (opts?.data) span.setAttribute("data", JSON.stringify(opts.data));

	try {
		const result = await fn();

		if (opts?.onSuccess) {
			const extra = opts.onSuccess(result);
			if (extra.data) {
				span.setAttribute("data", JSON.stringify({ ...(opts?.data ?? {}), ...extra.data }));
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

/** ------------------------------------------------------------
 *  Optional graceful teardown
 * ----------------------------------------------------------- */
export async function shutdownTracing() {
	if (globalSDK) {
		console.log("🛑  Shutting down OpenTelemetry...");
		await globalSDK.shutdown();
		globalTracer = undefined;
	}
}
