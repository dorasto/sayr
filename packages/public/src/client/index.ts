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

    let url: string;
    try {
        url = path.startsWith("http")
            ? path
            : `${config.baseUrl}${path}`;
    } catch (err) {
        throw err;
    }

    try {
        hooks.onRequest?.(url, opts);
    } catch (err) {
        throw err;
    }

    let res: Response;

    try {
        const method = opts.method ?? "GET";


        // 🔴 Guard: GET must not have body
        if (method === "GET" && opts.body !== undefined) {
            throw new Error("GET request cannot have a body");
        }

        res = await fetch(url, {
            method,
            headers: {
                ...(config.token
                    ? { Authorization: `Bearer ${config.token}` }
                    : {}),
                ...(opts.body && method !== "GET"
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...config.headers,
                ...opts.headers
            },
            body:
                opts.body && method !== "GET"
                    ? JSON.stringify(opts.body)
                    : undefined,
            signal: opts.signal
        });
    } catch (err) {
        const error: ApiError = {
            success: false,
            error: "NETWORK_ERROR",
            message: "Failed to reach Sayr API",
            // 👇 keep raw error so we can see it
            // @ts-ignore
            raw: err
        };

        hooks.onError?.(error);
        throw error;
    }

    try {
        hooks.onResponse?.(res);
    } catch (err) {
        throw err;
    }

    let json: any;
    try {
        json = await res.json();
    } catch (err) {
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