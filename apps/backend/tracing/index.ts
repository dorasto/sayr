// tracing.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { trace } from "@opentelemetry/api";

let globalTracer: ReturnType<typeof trace.getTracer> | undefined;

export async function initTracing() {
	const sdk = new NodeSDK({
		traceExporter: new OTLPTraceExporter({
			url: `https://${process.env.AXIOM_BACKEND_OTEL_DOMAIN}/v1/traces`,
			headers: {
				Authorization: `Bearer ${process.env.AXIOM_BACKEND_OTEL_TOKEN}`,
				"X-Axiom-Dataset": process.env.AXIOM_BACKEND_OTEL_DATASET || "",
			},
		}),
		serviceName: "sayr-backend",
	});

	await sdk.start(); // makes provider global

	process.on("SIGTERM", () => sdk.shutdown());
	process.on("SIGINT", () => sdk.shutdown());

	globalTracer = trace.getTracer("sayr-wide-event");
	console.log("✅ OpenTelemetry SDK started");
}

// simple accessor
export function getTracer() {
	if (!globalTracer) {
		globalTracer = trace.getTracer("sayr-wide-event");
	}
	return globalTracer;
}
