import type { Edition } from "./types";

/**
 * Build-time baked edition value.
 *
 * In Docker images, SAYR_EDITION_BAKED is set during the build and compiled
 * into the JavaScript bundle. Once baked, it cannot be overridden by runtime
 * environment variables -- this is what prevents CE image users from switching
 * to cloud mode.
 *
 * In local development (pnpm dev), this is always undefined, so the code
 * falls through to reading SAYR_EDITION / SAYR_CLOUD from the environment.
 */
const BAKED_EDITION = process.env.SAYR_EDITION_BAKED as Edition | undefined;

/** Cached edition value so we only compute once per process. */
let cachedEdition: Edition | undefined;

/**
 * Detect which edition this Sayr instance is running.
 *
 * Priority:
 * 1. Build-time baked value (Docker images) -- cannot be overridden
 * 2. SAYR_EDITION env var (local development)
 * 3. Legacy SAYR_CLOUD env var (backwards compat)
 * 4. Default: "community"
 *
 * On community edition, a valid enterprise license can upgrade to "enterprise".
 * This is a placeholder for future Polar license key integration.
 */
export function getEdition(): Edition {
	if (cachedEdition !== undefined) {
		return cachedEdition;
	}

	const edition = resolveEdition();
	cachedEdition = edition;
	return edition;
}

function resolveEdition(): Edition {
	// Build-time baked value always wins (Docker images)
	if (BAKED_EDITION === "cloud" || BAKED_EDITION === "community") {
		// Enterprise is the only upgrade path from a community image
		if (BAKED_EDITION === "community" && hasValidEnterpriseLicense()) {
			return "enterprise";
		}
		return BAKED_EDITION;
	}

	// Local development: read from env var
	const envEdition = process.env.SAYR_EDITION as Edition | undefined;
	if (envEdition === "cloud" || envEdition === "community" || envEdition === "enterprise") {
		return envEdition;
	}

	// Legacy fallback for existing SAYR_CLOUD usage
	if (process.env.SAYR_CLOUD === "true") {
		return "cloud";
	}

	// Default to community
	return "community";
}

/**
 * Check if a valid enterprise license key is present.
 *
 * TODO: Implement Polar license key validation when the enterprise product is created.
 * This will:
 * 1. Read the license key from DB (system org settings) or SAYR_LICENSE_KEY env var
 * 2. Validate against Polar's license key API
 * 3. Cache the result with a TTL
 *
 * For now, always returns false -- enterprise edition is not yet available.
 */
function hasValidEnterpriseLicense(): boolean {
	return false;
}

/**
 * Reset the cached edition. Useful for testing.
 * @internal
 */
export function _resetEditionCache(): void {
	cachedEdition = undefined;
}

// Convenience boolean checks

export function isCloud(): boolean {
	return getEdition() === "cloud";
}

export function isSelfHosted(): boolean {
	const edition = getEdition();
	return edition === "community" || edition === "enterprise";
}

export function isCommunity(): boolean {
	return getEdition() === "community";
}

export function isEnterprise(): boolean {
	return getEdition() === "enterprise";
}

/**
 * Check if AI features are available on this instance.
 *
 * AI is available when:
 * - Running on cloud (sayr.io), OR
 * - Running on community/enterprise AND a MISTRAL_API_KEY is configured
 *
 * **Server-side only** — reads process.env.MISTRAL_API_KEY.
 */
export function isAiEnabled(): boolean {
	return isCloud() || !!process.env.MISTRAL_API_KEY;
}
