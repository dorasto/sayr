import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import type { ExportResult } from "@opentelemetry/core";
import { ExportResultCode } from "@opentelemetry/core";

const traceBuffer = new Map<string, ReadableSpan[]>();

const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

const isHttpSpan = (span: ReadableSpan) =>
	span.name.startsWith("GET ") ||
	span.name.startsWith("POST ") ||
	span.name.startsWith("PUT ") ||
	span.name.startsWith("DELETE ");

function formatData(
	data: Record<string, unknown>,
	pad: string
) {
	return Object.entries(data)
		.map(([key, value]) => `${pad}    ${key}: ${String(value)}`)
		.join("\n");
}

export class PrettyConsoleSpanExporter implements SpanExporter {
	export(
		spans: ReadableSpan[],
		resultCallback: (result: ExportResult) => void
	): void {
		for (const span of spans) {
			const traceId = span.spanContext().traceId;
			const existing = traceBuffer.get(traceId) ?? [];
			existing.push(span);
			traceBuffer.set(traceId, existing);
		}

		for (const [traceId, spansInTrace] of traceBuffer.entries()) {
			spansInTrace.sort((a, b) => a.startTime[0] - b.startTime[0]);

			const byId = new Map(
				spansInTrace.map((s) => [s.spanContext().spanId, s])
			);

			const children = new Map<string, ReadableSpan[]>();
			const roots: ReadableSpan[] = [];

			for (const span of spansInTrace) {
				const parentId = span.parentSpanContext?.spanId;
				if (parentId && byId.has(parentId)) {
					const list = children.get(parentId) ?? [];
					list.push(span);
					children.set(parentId, list);
				} else {
					roots.push(span);
				}
			}

			console.log(`\n${bold("Trace")} ${dim(traceId)}`);

			for (const root of roots) {
				if (isHttpSpan(root)) {
					const durationMs =
						(root.duration[0] * 1e9 + root.duration[1]) / 1e6;

					console.log(
						dim(`  ${root.name} (${durationMs.toFixed(2)}ms)`)
					);

					const rootChildren =
						children.get(root.spanContext().spanId) ?? [];

					for (const child of rootChildren) {
						this.printSpan(child, children, 2);
					}
				} else {
					this.printSpan(root, children, 1);
				}
			}

			console.log(dim("—".repeat(60)));
		}

		traceBuffer.clear();
		resultCallback({ code: ExportResultCode.SUCCESS });
	}

	private printSpan(
		span: ReadableSpan,
		children: Map<string, ReadableSpan[]>,
		indent: number
	) {
		const pad = "  ".repeat(indent);
		const durationMs =
			(span.duration[0] * 1e9 + span.duration[1]) / 1e6;

		const isError = span.status.code === 2;
		const title = `${span.name} (${durationMs.toFixed(2)}ms)`;

		console.log(pad + (isError ? red(title) : title));

		const attrs = span.attributes;

		const description = attrs["trace.description"];
		const outcome = attrs["trace.outcome"];

		if (description) {
			console.log(pad + `  ↳ description: ${description}`);
		}

		if (outcome) {
			console.log(pad + `  ↳ outcome: ${outcome}`);
		}

		const dataEntries = Object.entries(attrs).filter(
			([key]) =>
				key.startsWith("trace.data.") ||
				key.startsWith("trace.result.")
		);

		if (dataEntries.length > 0 && !isHttpSpan(span)) {
			const data: Record<string, unknown> = {};

			for (const [key, value] of dataEntries) {
				const shortKey = key
					.replace(/^trace\.data\./, "")
					.replace(/^trace\.result\./, "");

				data[shortKey] = value;
			}

			console.log(pad + "  ↳ data:");
			console.log(formatData(data, pad));
		}

		const spanChildren =
			children.get(span.spanContext().spanId) ?? [];

		for (const child of spanChildren) {
			this.printSpan(child, children, indent + 1);
		}
	}

	shutdown(): Promise<void> {
		return Promise.resolve();
	}
}