/** biome-ignore-all lint/suspicious/noExplicitAny: <needed dont ask> */
import { headlessToast } from "@repo/ui/components/headless-toast";
import type { NodeJSON } from "prosekit/core";
import { useCallback, useState } from "react";

/**
 * A custom React hook that wraps asynchronous actions with toast notifications
 * and exposes a loading state (`isFetching`) for UI interactions.
 *
 * While the action is running, a loading toast is displayed and `isFetching`
 * is set to `true`. When the action completes, a success or error toast is
 * displayed based on the returned result. The toast is automatically dismissed/updated
 * using the provided `actionId`.
 *
 * The provided function (`fn`) should return an object with an optional `success` and `error`
 * property. If `success` is truthy, the success toast will be shown; otherwise, an error toast
 * is displayed with a fallback message.
 *
 * @returns An object containing:
 * - `runWithToast` — A function to execute an async action with toasts and state control.
 * - `isFetching` — A boolean that indicates whether an action is currently in progress.
 *
 * @example
 * ```tsx
 * function UpdateTaskButton({ task }) {
 *   const { runWithToast, isFetching } = useToastAction();
 *
 *   const handleUpdate = () =>
 *     runWithToast(
 *       "update-task",
 *       {
 *         loading: { title: "Updating...", description: "Please wait" },
 *         success: { title: "Update successful", description: "Task updated!" },
 *         error: { title: "Update failed", description: "Could not update task." },
 *       },
 *       () => updateTaskAction(task.orgId, task.projectId, task.id, { status: "done" }, "ws_client_001")
 *     );
 *
 *   return (
 *     <button onClick={handleUpdate} disabled={isFetching}>
 *       {isFetching ? "Updating..." : "Update Task"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useToastAction() {
	const [isFetching, setIsFetching] = useState(false);

	const runWithToast = useCallback(
		async <T>(
			actionId: string,
			messages: {
				loading: { title: string; description?: string };
				success: { title: string; description?: string };
				error: { title: string; description?: string };
			},
			fn: () => Promise<T & { success?: boolean; skipped?: boolean; error?: string }>
		): Promise<T | null> => {
			headlessToast.loading({
				id: actionId,
				title: messages.loading.title,
				description: messages.loading.description,
			});

			setIsFetching(true);

			try {
				const result = await fn();
				if (result?.skipped) {
					setIsFetching(true);
					return result;
				}
				if (result?.success) {
					headlessToast.success({
						id: actionId,
						title: messages.success.title,
						description: messages.success.description,
					});
				} else {
					headlessToast.error({
						id: actionId,
						title: messages.error.title,
						description: result?.error || messages.error.description || "Unknown error",
					});
				}
				setIsFetching(false);
				return result;
			} catch (err: any) {
				headlessToast.error({
					id: actionId,
					title: messages.error.title,
					description: err.message || messages.error.description,
				});
				setIsFetching(false);
				return null;
			}
		},
		[]
	);

	return { runWithToast, isFetching };
}

export function extractTextContent(doc: NodeJSON | NodeJSON[] | null | undefined): string {
	if (!doc) return "";

	const nodes = Array.isArray(doc) ? doc : [doc];

	const walk = (node: NodeJSON): string => {
		if (!node) return "";

		// 1. Text node
		if (node.type === "text") return node.text ?? "";

		// 2. Contentful block nodes (paragraph, headings, etc.)
		if (node.content && Array.isArray(node.content)) {
			return node.content.map(walk).join(" ");
		}

		// 3. Special block types we want custom labels for
		switch (node.type) {
			case "image": {
				const src = node.attrs?.src || "";
				return `[Image${src ? ` • ${src}` : ""}]`;
			}

			case "video": {
				const src = node.attrs?.src || "";
				return `[Video${src ? ` • ${src}` : ""}]`;
			}

			case "gif": {
				const src = node.attrs?.src || "";
				return `[Gif${src ? ` • ${src}` : ""}]`;
			}

			case "mention": {
				return `[Mention${node.attrs?.value ? ` • ${node.attrs.value}` : ""}]`;
			}

			case "codeBlock": {
				const txt = (node.content ?? []).map(walk).join(" ");
				// shorten very long code blocks
				const short = txt.slice(0, 50) + (txt.length > 50 ? "…" : "");
				return `[Code block: ${short}]`;
			}

			case "table": {
				const tableTxt = (node.content ?? []).map(walk).filter(Boolean).join(" | ");
				return `[Table${tableTxt ? `: ${tableTxt}` : ""}]`;
			}

			default:
				return "";
		}
	};

	return nodes.map(walk).join(" ").trim();
}
