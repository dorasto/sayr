import { eq } from "drizzle-orm";
import { db, schema } from "..";
import { NodeJSON } from "../../schema";
/**
 * Gets the assignee user IDs for a task.
 * Used internally to determine who should receive notifications.
 */
export async function getTaskAssigneeIds(taskId: string): Promise<string[]> {
	const assignees = await db
		.select({ userId: schema.taskAssignee.userId })
		.from(schema.taskAssignee)
		.where(eq(schema.taskAssignee.taskId, taskId));

	return assignees.map((a) => a.userId);
}

/**
 * Extracts user mention IDs from ProseMirror/ProseKit NodeJSON content.
 * Walks the content tree recursively to find mention nodes with kind === "user".
 */
export function extractUserMentions(content: NodeJSON | null | undefined): string[] {
	if (!content) return [];

	const mentions: string[] = [];

	function walk(node: NodeJSON) {
		if (node.type === "mention" && node.attrs?.kind === "user" && node.attrs?.id) {
			mentions.push(node.attrs.id as string);
		}
		if (node.content) {
			for (const child of node.content) {
				walk(child);
			}
		}
	}

	walk(content);
	return [...new Set(mentions)];
}

/**
 * Extracts task mention IDs from ProseMirror/ProseKit NodeJSON content.
 * Walks the content tree recursively to find mention nodes with kind === "task".
 * Returns deduplicated task UUIDs.
 */
export function extractTaskMentions(content: NodeJSON | null | undefined): string[] {
	if (!content) return [];

	const mentions: string[] = [];

	function walk(node: NodeJSON) {
		if (node.type === "mention" && node.attrs?.kind === "task" && node.attrs?.id) {
			mentions.push(node.attrs.id as string);
		}
		if (node.content) {
			for (const child of node.content) {
				walk(child);
			}
		}
	}

	walk(content);
	return [...new Set(mentions)];
}
