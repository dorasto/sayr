/**
 * LLMOContent — Server-rendered, visually-hidden ProseKit HTML for AI extractors.
 *
 * Renders task/release/comment content as ProseKit-rendered HTML in the HTML body
 * so that AI tools (webfetch, crawlers, LLM retrieval systems) can extract it.
 *
 * Uses Tailwind's sr-only class to keep content in the DOM but invisible visually.
 * This is the TanStack Start recommended approach for LLMO alongside JSON-LD.
 *
 * @see https://tanstack.com/start/latest/docs/framework/react/guide/llmo
 */

export interface LLMOComment {
	author: string;
	html: string;
	createdAt?: string;
	replies?: LLMOComment[];
}

export interface LLMOContentProps {
	type: "task" | "release";
	title: string;
	shortId?: string | number;
	status?: string;
	priority?: string;
	labels?: string[];
	descriptionHtml: string;
	comments?: LLMOComment[];
	orgName?: string;
	url?: string;
}

function formatTimestamp(dateStr: string | undefined): string {
	if (!dateStr) return "";
	const date = new Date(dateStr);
	return date.toLocaleString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function CommentThread({
	comment,
	depth = 0,
}: {
	comment: LLMOComment;
	depth?: number;
}) {
	return (
		<section style={{ marginLeft: depth > 0 ? `${depth * 1.5}rem` : undefined }}>
			<h3>
				{depth > 0 && "↳ "}
				{comment.author}
				{comment.createdAt ? ` on ${formatTimestamp(comment.createdAt)}` : ""}
			</h3>
			<div
				// biome-ignore lint/security/noDangerouslySetInnerHtml: ProseKit SSR HTML is schema-controlled and safe
				dangerouslySetInnerHTML={{ __html: comment.html }}
			/>
			{comment.replies && comment.replies.length > 0 && (
				<div>
					{comment.replies.map((reply, i) => (
						<CommentThread key={reply.createdAt ?? i} comment={reply} depth={depth + 1} />
					))}
				</div>
			)}
		</section>
	);
}

export function LLMOContent({
	type,
	title,
	shortId,
	status,
	priority,
	labels,
	descriptionHtml,
	comments,
	orgName,
	url,
}: LLMOContentProps) {
	const id = shortId ? `#${shortId}` : undefined;
	const fullTitle = id ? `${id} - ${title}` : title;

	return (
		<div className="sr-only" aria-hidden="true" data-llmo-content>
			<article>
				<h1>{fullTitle}</h1>
				<p>
					{type === "task" ? "Task" : "Release"}
					{orgName ? ` in ${orgName}` : ""}
					{url ? ` — ${url}` : ""}
				</p>

				{status && (
					<p>
						Status: {status}
					</p>
				)}
				{priority && priority !== "none" && (
					<p>
						Priority: {priority}
					</p>
				)}
				{labels && labels.length > 0 && (
					<p>
						Labels: {labels.join(", ")}
					</p>
				)}

				{descriptionHtml && (
					<>
						<h2>Description</h2>
						<div
							// biome-ignore lint/security/noDangerouslySetInnerHtml: ProseKit SSR HTML is schema-controlled and safe
							dangerouslySetInnerHTML={{ __html: descriptionHtml }}
						/>
					</>
				)}

				{comments && comments.length > 0 && (
					<>
						<h2>Comments</h2>
						{comments.map((c, i) => (
							<CommentThread key={c.createdAt ?? i} comment={c} />
						))}
					</>
				)}
			</article>
		</div>
	);
}
