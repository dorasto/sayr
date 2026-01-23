import { ApiError } from "../types";

/* ────────────────────────────
   Types
──────────────────────────── */
export type RequestOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: Record<string, string>;
    body?: Record<string, string>;
    signal?: AbortSignal;
};

type Hooks = {
    onRequest?: (url: string, opts: RequestOptions) => void;
    onResponse?: (res: Response) => void;
    onError?: (error: ApiError | unknown) => void;
};

type ClientConfig = {
    token?: string;
    headers?: Record<string, string>;
    fetch: typeof fetch;
    baseUrl: string;
};

/* ────────────────────────────
   Internal state
──────────────────────────── */
const DEFAULT_API = "https://api.sayr.io";

const config: ClientConfig = {
    fetch: globalThis.fetch,
    baseUrl: DEFAULT_API
};

const hooks: Hooks = {};

/* ────────────────────────────
   Public config API
──────────────────────────── */
export function setToken(token?: string) {
    config.token = token;
}

export function getToken() {
    return config.token;
}

export function setHeaders(headers?: Record<string, string>) {
    config.headers = {
        ...config.headers,
        ...headers
    };
}

export function setFetch(fn: typeof fetch) {
    config.fetch = fn;
}

export function setBaseUrl(url: string) {
    config.baseUrl = url.replace(/\/$/, "");
}

export function setHooks(h: Hooks) {
    Object.assign(hooks, h);
}

export function resetClient() {
    config.token = undefined;
    config.headers = undefined;
    config.baseUrl = DEFAULT_API;
}

/* ────────────────────────────
   Request helper
──────────────────────────── */
export async function request<T>(
    path: string,
    opts: RequestOptions = {}
): Promise<T> {
    const url = path.startsWith("http")
        ? path
        : `${config.baseUrl}${path}`;

    hooks.onRequest?.(url, opts);

    let res: Response;

    try {
        res = await config.fetch(url, {
            method: opts.method ?? "GET",
            headers: {
                ...(config.token
                    ? { Authorization: `Bearer ${config.token}` }
                    : {}),
                ...(opts.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...config.headers,
                ...opts.headers
            },
            body: opts.body
                ? JSON.stringify(opts.body)
                : undefined,
            signal: opts.signal
        });
    } catch (err) {
        const error: ApiError = {
            success: false,
            error: "NETWORK_ERROR",
            message: "Failed to reach Sayr API"
        };
        hooks.onError?.(error);
        throw error;
    }

    hooks.onResponse?.(res);

    let json: any;
    try {
        json = await res.json();
    } catch {
        const error: ApiError = {
            success: false,
            error: "INVALID_RESPONSE",
            message: "Server returned invalid JSON",
            status: res.status
        };
        hooks.onError?.(error);
        throw error;
    }

    if (!res.ok || !json.success) {
        const error: ApiError = {
            ...json,
            success: false,
            status: res.status
        };
        hooks.onError?.(error);
        throw error;
    }

    return json;
}