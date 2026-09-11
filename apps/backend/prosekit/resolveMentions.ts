import { db, schema } from "@repo/database";
import { formatTaskKey } from "@repo/util";
import { and, eq } from "drizzle-orm";

/**
 * Before serializing a description/comment to markdown for a GitHub push,
 * rewrites every `kind: "task"` mention's fallback `value` into a real
 * markdown link to the task's public URL. `prosekitJSONToMarkdown`'s
 * `mention` handler just writes `value` verbatim, so without this every
 * task mention shows up on GitHub as plain, unlinked text.
 *
 * Leaves `value` untouched when the mentioned task can't be resolved, or is
 * private — this content is headed to a public GitHub issue, so a private
 * task's existence/title must never leak into it via a link.
 */
export async function resolveMentionLinksForGithub(doc: schema.NodeJSON, orgId: string): Promise<schema.NodeJSON> {
	const org = await db.query.organization.findFirst({
		where: eq(schema.organization.id, orgId),
		columns: { shortId: true, slug: true },
	});
	if (!org) return doc;
	// Rebind so the nested closure below narrows correctly — TS doesn't
	// carry the `!org` guard's narrowing across a function boundary.
	const resolvedOrg = org;

	async function walk(node: unknown): Promise<unknown> {
		if (!node || typeof node !== "object") return node;
		const n = node as { type?: string; attrs?: Record<string, unknown>; content?: unknown[] };

		if (n.type === "mention" && n.attrs?.kind === "task" && n.attrs?.id) {
			const task = await db.query.task.findFirst({
				where: and(eq(schema.task.id, n.attrs.id as string), eq(schema.task.organizationId, orgId)),
				columns: { shortId: true, visible: true },
			});
			if (task?.visible === "public") {
				const url = `https://${resolvedOrg.slug}.${process.env.VITE_ROOT_DOMAIN}/${task.shortId}`;
				const key = formatTaskKey(resolvedOrg.shortId, task.shortId);
				return { ...n, attrs: { ...n.attrs, value: `[${key}](${url})` } };
			}
			return n;
		}

		if (Array.isArray(n.content)) {
			return { ...n, content: await Promise.all(n.content.map(walk)) };
		}

		return n;
	}

	return (await walk(doc)) as schema.NodeJSON;
}
