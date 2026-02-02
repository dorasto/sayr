import { useEffect } from "react";
import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

let initialized = false;

/**
 * Initialize PostHog on the client side only.
 * Uses external_scripts_inject_target: 'head' to prevent hydration issues.
 */
export function initPostHog() {
	if (typeof window === "undefined" || initialized || !POSTHOG_KEY) {
		return;
	}

	initialized = true;

	posthog.init(POSTHOG_KEY, {
		api_host: POSTHOG_HOST,
		// Prevent hydration issues by injecting scripts into head
		external_scripts_inject_target: "head",
		// Capture pageviews automatically
		capture_pageview: true,
		capture_pageleave: true,
		// Web Vitals and performance
		capture_performance: true,
		// Session recording for debugging slow loads
		disable_session_recording: false,
		// Autocapture clicks, inputs, etc.
		autocapture: true,
		// Enable exception autocapture for window.onerror and unhandled promise rejections
		capture_exceptions: true,
		// Don't send data in development unless you want to test
		loaded: () => {
			if (import.meta.env.DEV) {
				console.log("[PostHog] Initialized in development mode with error tracking");
			}
		},
	});
}

/**
 * Identify a user in PostHog after authentication
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
	if (typeof window === "undefined" || !POSTHOG_KEY) return;

	posthog.identify(userId, properties);
}

/**
 * Reset PostHog identity on logout
 */
export function resetPostHog() {
	if (typeof window === "undefined" || !POSTHOG_KEY) return;

	posthog.reset();
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
	if (typeof window === "undefined" || !POSTHOG_KEY) return;

	posthog.capture(eventName, properties);
}

/**
 * Capture an exception to PostHog error tracking.
 * Use this for:
 * - Caught errors in try/catch blocks
 * - Error boundaries
 * - API errors shown to users
 * - Toast error messages
 */
export function captureException(
	error: Error | string,
	additionalProperties?: Record<string, unknown>
) {
	if (typeof window === "undefined" || !POSTHOG_KEY) return;

	const errorObj = typeof error === "string" ? new Error(error) : error;

	posthog.captureException(errorObj, {
		...additionalProperties,
		// Add source context for filtering in PostHog
		$exception_source: additionalProperties?.$exception_source || "manual",
	});

	// Also log to console in dev for visibility
	if (import.meta.env.DEV) {
		console.error("[PostHog Exception]", errorObj, additionalProperties);
	}
}

/**
 * Capture an error shown to the user (e.g., in a toast or error UI).
 * This helps track user-facing errors specifically.
 */
export function captureUserFacingError(
	error: Error | string,
	context: {
		/** Where the error was shown: 'toast', 'error_boundary', 'error_page', 'inline' */
		displayType: "toast" | "error_boundary" | "error_page" | "inline" | "api_error";
		/** Optional: the component or page where it occurred */
		location?: string;
		/** Any additional context */
		[key: string]: unknown;
	}
) {
	captureException(error, {
		$exception_source: "user_facing",
		display_type: context.displayType,
		...context,
	});
}

/**
 * React component that syncs user identity with PostHog
 */
export function PostHogUserSync({ user }: { user?: { id: string; email?: string; name?: string } | null }) {
	useEffect(() => {
		if (user?.id) {
			identifyUser(user.id, {
				email: user.email,
				name: user.name,
			});
		}
	}, [user?.id, user?.email, user?.name]);

	return null;
}
