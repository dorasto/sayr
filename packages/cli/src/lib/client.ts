import type { ApiErrorEnvelope, ApiPagination, ApiSuccessEnvelope } from "../types";
import { DEFAULT_BASE_URL, readConfig } from "./config";

/**
 * Every `/me/*` route lives under this prefix regardless of host — the
 * shorter `api.<domain>/v1/me/...` alias only exists via a host-based rewrite
 * that never fires for `localhost` or any non-production host, so the CLI
 * always calls the full path directly.
 */
const ME_PREFIX = "/api/public/v1/me";

export class ApiClientError extends Error {
	readonly code: string;
	readonly status: number;

	constructor(code: string, message: string, status: number) {
		super(message);
		this.name = "ApiClientError";
		this.code = code;
		this.status = status;
	}
}

export interface ClientOverrides {
	token?: string;
	baseUrl?: string;
}

async function resolveConnection(overrides?: ClientOverrides): Promise<{ token: string; baseUrl: string }> {
	const config = await readConfig();
	const token = overrides?.token ?? process.env.SAYR_TOKEN ?? config.token;
	const baseUrl = (overrides?.baseUrl ?? process.env.SAYR_BASE_URL ?? config.baseUrl ?? DEFAULT_BASE_URL).replace(
		/\/+$/,
		""
	);

	if (!token) {
		throw new ApiClientError(
			"NOT_AUTHENTICATED",
			"Not logged in. Run `sayr login --token <api-key>` first, or set SAYR_TOKEN.",
			401
		);
	}

	return { token, baseUrl };
}

type QueryValue = string | number | boolean | undefined;

interface RequestInput {
	method?: "GET" | "POST" | "PATCH" | "DELETE";
	query?: Record<string, QueryValue>;
	body?: unknown;
	clientOptions?: ClientOverrides;
}

function buildQueryString(query?: Record<string, QueryValue>): string {
	if (!query) return "";
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined) continue;
		params.set(key, String(value));
	}
	const qs = params.toString();
	return qs ? `?${qs}` : "";
}

async function rawRequest<T>(path: string, opts: RequestInput): Promise<ApiSuccessEnvelope<T>> {
	const { token, baseUrl } = await resolveConnection(opts.clientOptions);
	const url = `${baseUrl}${ME_PREFIX}${path}${buildQueryString(opts.query)}`;

	let res: Response;
	try {
		res = await fetch(url, {
			method: opts.method ?? "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
			},
			body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
		});
	} catch (err) {
		throw new ApiClientError(
			"NETWORK_ERROR",
			`Failed to reach ${baseUrl} (${err instanceof Error ? err.message : String(err)})`,
			0
		);
	}

	let json: ApiSuccessEnvelope<T> | ApiErrorEnvelope;
	try {
		json = (await res.json()) as ApiSuccessEnvelope<T> | ApiErrorEnvelope;
	} catch {
		throw new ApiClientError(
			"INVALID_RESPONSE",
			`Server returned a non-JSON response (status ${res.status})`,
			res.status
		);
	}

	if (!res.ok || !json.success) {
		const failure = json as Partial<ApiErrorEnvelope>;
		throw new ApiClientError(
			failure.error ?? "REQUEST_FAILED",
			failure.message ?? failure.error ?? "Request failed",
			res.status
		);
	}

	return json;
}

/** GET/POST/PATCH/DELETE against `/me/*`, returning just the `data` payload. */
export async function apiRequest<T>(path: string, opts: RequestInput = {}): Promise<T> {
	const json = await rawRequest<T>(path, opts);
	return json.data;
}

/** Same as `apiRequest`, but for the paginated list endpoints. */
export async function apiRequestPaginated<T>(
	path: string,
	opts: RequestInput = {}
): Promise<{ data: T; pagination: ApiPagination }> {
	const json = await rawRequest<T>(path, opts);
	if (!json.pagination) {
		throw new ApiClientError("MISSING_PAGINATION", "Expected a paginated response but got none.", 500);
	}
	return { data: json.data, pagination: json.pagination };
}
