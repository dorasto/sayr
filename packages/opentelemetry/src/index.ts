import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { trace } from "@opentelemetry/api";
import { PrettyConsoleSpanExporter } from "./console";
import { getEditionCapabilities } from "@repo/edition";
let globalTracer: ReturnType<typeof trace.getTracer> | undefined;

export async function initTracing(_serviceName: string) {
	const { axiomTelemetryEnabled } = getEditionCapabilities();
	const appEnv = process.env.APP_ENV;
	const env = appEnv === "production" || appEnv === "development" ? appEnv : "development";
	const isProd = env === "production";
	const serviceName = `${_serviceName}${isProd ? "" : "-dev"}`;

	// LOCAL / SELF-HOSTED: log spans to console
	if (!axiomTelemetryEnabled) {
		const sdk = new NodeSDK({
			traceExporter: new PrettyConsoleSpanExporter(),
			serviceName,
		});

		await sdk.start();

		globalTracer = trace.getTracer(serviceName);
		console.log("OpenTelemetry in console mode");
		return;
	}

	// CLOUD MODE (Axiom)
	if (!process.env.AXIOM_OTEL_DOMAIN || !process.env.AXIOM_OTEL_TOKEN) {
		console.warn("OpenTelemetry not configured — missing AXIOM_OTEL_DOMAIN or AXIOM_OTEL_TOKEN.");
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
		serviceName,
	});

	await sdk.start();

	const shutdown = async () => {
		console.log("🛑 Shutting down OpenTelemetry SDK...");
		await sdk.shutdown().catch((err) => console.error("Error shutting down OpenTelemetry SDK:", err));
	};

	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);

	globalTracer = trace.getTracer(serviceName);
	console.log(`OpenTelemetry SDK started (${serviceName})`);
}

export function getTracer() {
	if (!globalTracer) {
		globalTracer = trace.getTracer("sayr-uninitialized");
	}
	return globalTracer;
}
