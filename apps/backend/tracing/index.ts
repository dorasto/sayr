// tracing.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { trace } from "@opentelemetry/api";

let globalTracer: ReturnType<typeof trace.getTracer> | undefined;

export async function initTracing() {
	// Detect environment
	const env = process.env.NODE_ENV || "development";
	const isProd = env === "production";
	const serviceName = `sayr-backend-${isProd ? "prod" : "dev"}`;
	const sdk = new NodeSDK({
		traceExporter: new OTLPTraceExporter({
			url: `https://${process.env.AXIOM_BACKEND_OTEL_DOMAIN}/v1/traces`,
			headers: {
				Authorization: `Bearer ${process.env.AXIOM_BACKEND_OTEL_TOKEN}`,
				"X-Axiom-Dataset": process.env.AXIOM_BACKEND_OTEL_DATASET || "",
			},
		}),
		// Name appears in Axiom/Grafana/Jaeger as the OTel Service
		serviceName,
	});

	await sdk.start(); // sets as global provider

	process.on("SIGTERM", () => sdk.shutdown());
	process.on("SIGINT", () => sdk.shutdown());

	globalTracer = trace.getTracer(serviceName);
	console.log(`✅ OpenTelemetry SDK started (${serviceName})`);
}

// simple accessor
export function getTracer() {
	if (!globalTracer) {
		// Fallback name if initTracing not called yet
		globalTracer = trace.getTracer("sayr-backend-uninitialized");
	}
	return globalTracer;
}
