import type { ApiKeyScope } from "@repo/util";

const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

const API_KEYS_URL = `${API_URL}/v1/api-keys`;

/** A personal API key as returned by the list endpoint. The secret is never included. */
export interface ApiKeyListItem {
	id: string;
	name: string | null;
	start: string | null;
	prefix: string | null;
	enabled: boolean;
	scopes: string[];
	expiresAt: string | null;
	createdAt: string;
	lastRequest: string | null;
	requestCount: number;
	rateLimitMax: number | null;
	rateLimitTimeWindow: number | null;
}

/**
 * Returned by create/regenerate only. `key` is the plaintext secret and is shown
 * exactly once — it can never be retrieved again.
 */
export interface ApiKeyWithSecret {
	id: string;
	name: string | null;
	start: string | null;
	prefix: string | null;
	scopes: string[];
	expiresAt: string | null;
	createdAt: string;
	key: string;
}

/** Standard envelope for the mutating endpoints, shaped for `runWithToast`. */
export interface ApiKeyActionResult<T> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

async function apiKeyRequest<T>(url: string, init?: RequestInit): Promise<ApiKeyActionResult<T>> {
	try {
		const res = await fetch(url, { credentials: "include", ...init });
		const json = await res.json();

		if (!res.ok || !json?.success) {
			return {
				success: false,
				error: json?.error || `Request failed (${res.status})`,
				message: json?.message,
			};
		}

		return { success: true, data: json.data as T };
	} catch (error) {
		console.error("API key request failed", { url, error });
		return { success: false, error: "Request failed" };
	}
}

/**
 * Lists the current user's personal API keys.
 *
 * @returns The user's keys, without secrets.
 */
export async function listApiKeys(): Promise<ApiKeyListItem[]> {
	const res = await fetch(API_KEYS_URL, { credentials: "include" });

	if (!res.ok) {
		throw new Error(`Failed to fetch API keys: ${res.statusText}`);
	}

	const json = await res.json();
	return json.data ?? [];
}

/**
 * Creates a personal API key.
 *
 * @param data - Key name, granted scopes, and optional lifetime in days (null/omitted = never expires).
 * @returns The new key including its plaintext secret, which is only ever returned here.
 */
export async function createApiKey(data: {
	name: string;
	scopes: ApiKeyScope[];
	expiresInDays?: number | null;
}): Promise<ApiKeyActionResult<ApiKeyWithSecret>> {
	return apiKeyRequest<ApiKeyWithSecret>(API_KEYS_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}

/**
 * Rotates a key's secret, keeping its name, scopes, and remaining lifetime.
 * The previous secret stops working immediately.
 *
 * @param keyId - The key to regenerate.
 * @returns The rotated key including its fresh plaintext secret.
 */
export async function regenerateApiKey(keyId: string): Promise<ApiKeyActionResult<ApiKeyWithSecret>> {
	return apiKeyRequest<ApiKeyWithSecret>(`${API_KEYS_URL}/${keyId}/regenerate`, {
		method: "POST",
	});
}

/**
 * Updates a key's name, enabled state, or scopes.
 *
 * @param keyId - The key to update.
 * @param data - The fields to change.
 * @returns The updated key's id.
 */
export async function updateApiKey(
	keyId: string,
	data: { name?: string; enabled?: boolean; scopes?: ApiKeyScope[] }
): Promise<ApiKeyActionResult<{ id: string }>> {
	return apiKeyRequest<{ id: string }>(`${API_KEYS_URL}/${keyId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}

/**
 * Permanently revokes (deletes) a key.
 *
 * @param keyId - The key to revoke.
 * @returns The revoked key's id.
 */
export async function revokeApiKey(keyId: string): Promise<ApiKeyActionResult<{ id: string }>> {
	return apiKeyRequest<{ id: string }>(`${API_KEYS_URL}/${keyId}`, {
		method: "DELETE",
	});
}
