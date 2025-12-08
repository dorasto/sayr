/** biome-ignore-all lint/suspicious/noExplicitAny: <needed dont ask> */
import type { PartialBlock } from "@blocknote/core";
import { headlessToast } from "@repo/ui/components/headless-toast";
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
			fn: () => Promise<
				T & { success?: boolean; skipped?: boolean; error?: string }
			>,
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
						description:
							result?.error || messages.error.description || "Unknown error",
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
		[],
	);

	return { runWithToast, isFetching };
}

export const extractTextContent = (
	blocks: PartialBlock[] | undefined,
): string => {
	const getTextFromContent = (content: unknown): string => {
		if (Array.isArray(content)) {
			return content
				.map((item: any) => (typeof item.text === "string" ? item.text : ""))
				.join(" ");
		} else if (
			content &&
			typeof content === "object" &&
			"rows" in content &&
			Array.isArray((content as any).rows)
		) {
			// Handle table content (rows → cells → text)
			return (content as any).rows
				.map((row: any) =>
					row.cells
						.map((cell: any) => getTextFromContent(cell.content ?? []))
						.join(" • "),
				)
				.join(" | ");
		}
		return "";
	};

	const extractFromBlock = (block: PartialBlock): string => {
		switch (block.type) {
			case "paragraph":
			case "heading":
			case "quote":
			case "checkListItem":
			case "bulletListItem":
			case "numberedListItem":
			case "toggleListItem":
				return getTextFromContent(block.content);

			case "image": {
				const src =
					typeof (block.props as any)?.url === "string"
						? (block.props as any).url
						: "";
				const caption = getTextFromContent(block.content) || "Image";
				return `[Image: ${caption}${src ? ` • ${src}` : ""}]`;
			}

			case "video": {
				const url =
					typeof (block.props as any)?.url === "string"
						? (block.props as any).url
						: "";
				return `[Video: ${url}]`;
			}

			case "codeBlock": {
				const codeText = getTextFromContent(block.content);
				return `[Code block: ${codeText.slice(0, 50)}${codeText.length > 50 ? "…" : ""}]`;
			}

			case "table": {
				const tableText = getTextFromContent(block.content);
				return `[Table: ${tableText}]`;
			}

			default:
				if (Array.isArray(block.children) && block.children.length > 0) {
					return block.children.map(extractFromBlock).join(" ");
				}
				return "";
		}
	};

	return blocks?.map(extractFromBlock).join(" ").trim() || "";
};
