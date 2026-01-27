import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
    trace,
    context,
    propagation,
    SpanStatusCode,
    Attributes,
    Context,
    Span,
} from "@opentelemetry/api";
import { resourceFromAttributes } from "@opentelemetry/resources";

let initialized = false;
let globalTracer: ReturnType<typeof trace.getTracer> | undefined;
let fetchPatched = false;

// Short-lived interaction span
let activeInteractionSpan: Span | undefined;
let activeInteractionCtx: Context | undefined;
let interactionTimeout: ReturnType<typeof setTimeout> | undefined;

export function initOpenTel(_serviceName: string, isProd: boolean) {
    if (typeof window === "undefined" || initialized) return;
    initialized = true;
    const serviceName = `${_serviceName}${isProd ? "" : "-dev"}`;
    const provider = new WebTracerProvider({
        resource: resourceFromAttributes({
            "service.name": serviceName,
        }),
        spanProcessors: [
            new BatchSpanProcessor(
                new OTLPTraceExporter({ url: "/api/traces" })
            ),
        ],
    });

    provider.register();

    globalTracer = trace.getTracer(serviceName);
    console.log(`OpenTelemetry initialized (${serviceName})`);
}

export function getTracer() {
    if (!globalTracer) {
        globalTracer = trace.getTracer("app-uninitialized");
    }
    return globalTracer;
}

// -------------------- INTERACTIONS --------------------

function startInteraction(name: string, attrs: Attributes) {
    endInteraction();

    const tracer = getTracer();
    activeInteractionSpan = tracer.startSpan(name);
    activeInteractionSpan.setAttributes({
        ...attrs,
        "page.path": window.location.pathname,
    });

    activeInteractionCtx = trace.setSpan(context.active(), activeInteractionSpan);

    // safety timeout only
    interactionTimeout = setTimeout(() => endInteraction(), 5000);
}

function endInteraction() {
    if (interactionTimeout) {
        clearTimeout(interactionTimeout);
        interactionTimeout = undefined;
    }

    if (activeInteractionSpan) {
        activeInteractionSpan.end();
        activeInteractionSpan = undefined;
        activeInteractionCtx = undefined;
    }
}

// -------------------- FETCH PATCH --------------------

export function patchGlobalFetch(options?: {
    excludeUrls?: (string | RegExp)[];
    logBody?: boolean;
}) {
    if (typeof window === "undefined" || fetchPatched) return;
    fetchPatched = true;

    const originalFetch = window.fetch.bind(window);
    const excludeUrls = options?.excludeUrls ?? ["/api/traces"];
    const logBody = options?.logBody ?? false;

    const shouldExclude = (url: string) =>
        excludeUrls.some((pattern) =>
            typeof pattern === "string" ? url.includes(pattern) : pattern.test(url)
        );

    window.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit
    ): Promise<Response> => {
        const url =
            typeof input === "string"
                ? input
                : input instanceof Request
                    ? input.url
                    : String(input);

        if (shouldExclude(url)) {
            return originalFetch(input, init);
        }

        const tracer = getTracer();
        const method = init?.method ?? "GET";
        const urlObj = new URL(url, window.location.origin);
        const path = urlObj.pathname;

        const parentCtx = activeInteractionCtx ?? context.active();

        const span = tracer.startSpan(
            `${method} ${path}`,
            undefined,
            parentCtx
        );

        // ✅ end interaction immediately — no grouping
        endInteraction();

        const attrs: Attributes = {
            "http.method": method,
            "http.url": url,
            "http.path": path,
        };

        if (logBody && init?.body) {
            const bodyInfo = getBodyInfo(init.body);
            attrs["http.request.body_type"] = bodyInfo.type;
            if (bodyInfo.size) attrs["http.request.body_size"] = bodyInfo.size;
        }

        span.setAttributes(attrs);

        const spanCtx = trace.setSpan(context.active(), span);

        try {
            const headers = new Headers(init?.headers);

            propagation.inject(spanCtx, headers, {
                set: (carrier, key, value) => carrier.set(key, value),
            });

            const response = await context.with(spanCtx, () =>
                originalFetch(input, { ...init, headers })
            );

            span.setAttribute("http.status_code", response.status);
            span.setStatus({
                code: response.ok ? SpanStatusCode.OK : SpanStatusCode.ERROR,
            });

            return response;
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
    };

    console.log("Global fetch patched for tracing");
}

// -------------------- CLICK TRACKING --------------------

export function initClickTracking() {
    if (typeof window === "undefined") return;

    document.addEventListener(
        "click",
        (event) => {
            const target = event.target as HTMLElement;
            const el = target.closest("button, a, [role='button'], [data-track]");
            if (!el) return;

            const trackName = el.getAttribute("data-track");
            if (!trackName) return;

            startInteraction(`user.${trackName}`, {
                "track.name": trackName,
                "element.tag": el.tagName.toLowerCase(),
            });
        },
        { capture: true }
    );

    console.log("Click tracking initialized");
}

// -------------------- BODY INSPECTION --------------------

function getBodyInfo(body: RequestInit["body"]): {
    type: string;
    size?: number;
} {
    if (!body) return { type: "empty" };
    if (typeof body === "string") return { type: "string", size: body.length };
    if (body instanceof Blob) return { type: "Blob", size: body.size };
    if (body instanceof ArrayBuffer)
        return { type: "ArrayBuffer", size: body.byteLength };
    return { type: typeof body };
}

export { trace, context, propagation };