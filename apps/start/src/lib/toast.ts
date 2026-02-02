/**
 * Toast utilities with automatic error tracking via PostHog.
 * 
 * Use these instead of importing directly from @repo/ui when you want
 * error toasts to be automatically tracked.
 */

import { headlessToast, type HeadlessToastOptions } from "@repo/ui/components/headless-toast";
import { captureUserFacingError } from "@/components/PostHogProvider";

type ToastOptions = Omit<HeadlessToastOptions, "variant">;

/**
 * Show a toast and optionally track it as an error in PostHog.
 * Re-exports the headlessToast function with the same API.
 */
export const toast = Object.assign(
	(opts: HeadlessToastOptions) => headlessToast(opts),
	{
		success: (opts: ToastOptions) => headlessToast.success(opts),
		info: (opts: ToastOptions) => headlessToast.info(opts),
		warning: (opts: ToastOptions) => headlessToast.warning(opts),
		loading: (opts: ToastOptions) => headlessToast.loading(opts),

		/**
		 * Show an error toast AND capture it to PostHog error tracking.
		 * Use this for user-facing errors that should be tracked.
		 */
		error: (opts: ToastOptions & { 
			/** Set to false to skip PostHog tracking */
			track?: boolean;
			/** Additional context for the error */
			errorContext?: Record<string, unknown>;
		}) => {
			const { track = true, errorContext, ...toastOpts } = opts;

			// Capture to PostHog if tracking is enabled
			if (track) {
				const errorMessage = toastOpts.description || toastOpts.title || "Unknown error";
				captureUserFacingError(new Error(String(errorMessage)), {
					displayType: "toast",
					title: toastOpts.title,
					description: toastOpts.description,
					...errorContext,
				});
			}

			return headlessToast.error(toastOpts);
		},
	}
);

/**
 * Helper to show an error toast from a caught error object.
 * Extracts message and tracks the original error.
 */
export function toastError(
	error: Error | string | unknown,
	options?: {
		title?: string;
		/** Set to false to skip PostHog tracking */
		track?: boolean;
		/** Additional context for the error */
		errorContext?: Record<string, unknown>;
	}
) {
	const { title = "Error", track = true, errorContext } = options ?? {};
	
	// Extract error message
	let message: string;
	let errorObj: Error;
	
	if (error instanceof Error) {
		message = error.message;
		errorObj = error;
	} else if (typeof error === "string") {
		message = error;
		errorObj = new Error(error);
	} else {
		message = "An unexpected error occurred";
		errorObj = new Error(message);
	}

	// Capture to PostHog if tracking is enabled
	if (track) {
		captureUserFacingError(errorObj, {
			displayType: "toast",
			title,
			...errorContext,
		});
	}

	return headlessToast.error({
		title,
		description: message,
	});
}
