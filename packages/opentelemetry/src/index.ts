import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { trace } from "@opentelemetry/api";

let globalTracer: ReturnType<typeof trace.getTracer> | undefined;

export async function initTracing(_serviceName: string) {
	const IS_CLOUD = process.env.IS_CLOUD === "true";
	const env = process.env.NODE_ENV || "development";
	const isProd = env === "production";
	const serviceName = `${_serviceName}${isProd ? "" : "-dev"}`;

	if (!IS_CLOUD) {
		console.log(
			`☁️  Cloud tracing disabled (IS_CLOUD = ${process.env.IS_CLOUD})`,
		);
		globalTracer = trace.getTracer(serviceName);
		return;
	}

	if (!process.env.AXIOM_OTEL_DOMAIN || !process.env.AXIOM_OTEL_TOKEN) {
		console.warn(
			"⚠️ OpenTelemetry not configured — missing AXIOM_OTEL_DOMAIN or AXIOM_OTEL_TOKEN.",
		);
		return;
	}

	const sdk = new NodeSDK({
		traceExporter: new OTLPTraceExporter({
			url: `https://${process.env.AXIOM_OTEL_DOMAIN}/v1/traces`,
			headers: {
				Authorization: `Bearer ${process.env.AXIOM_OTEL_TOKEN}`,
				"X-Axiom-Dataset": process.env.AXIOM_OTEL_DATASET || "",
			},
		}),
		// Name appears in Axiom/Grafana/Jaeger as the OTel Service
		serviceName,
	});

	await sdk.start();

	const shutdown = async () => {
		console.log("🛑 Shutting down OpenTelemetry SDK...");
		await sdk
			.shutdown()
			.catch((err) =>
				console.error("Error shutting down OpenTelemetry SDK:", err),
			);
	};

	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);

	globalTracer = trace.getTracer(serviceName);
	console.log(`✅ OpenTelemetry SDK started (${serviceName})`);
}

export function getTracer() {
	if (!globalTracer) {
		globalTracer = trace.getTracer("sayr-uninitialized");
	}
	return globalTracer;
}
