import { cn } from "@repo/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { parseReleaseNotes, type ReleaseNoteInline } from "@/lib/portal/release-notes";

interface ReleaseNotesProps {
	markdown: string | null | undefined;
	/** The org's task key prefix (`SAY` in `(SAY-69)`), never hard-coded. */
	orgPrefix: string;
	orgSlug: string;
	className?: string;
}

function Inline({ tokens, orgSlug }: { tokens: ReadonlyArray<ReleaseNoteInline>; orgSlug: string }) {
	return (
		<>
			{tokens.map((token, index) => {
				// Tokens have no identity of their own and the list is static per render.
				const key = `${token.type}-${index}`;
				switch (token.type) {
					case "text":
						return <Fragment key={key}>{token.text}</Fragment>;
					case "bold":
						return (
							<b key={key} className="font-semibold">
								{token.text}
							</b>
						);
					case "code":
						return (
							<code key={key} className="rounded-[5px] bg-portal-raised px-1.5 py-px font-mono text-[0.88em]">
								{token.text}
							</code>
						);
					case "link":
						return (
							<a
								key={key}
								href={token.href}
								target="_blank"
								rel="noopener noreferrer"
								className="font-medium text-portal-accent-ink hover:underline focus-visible:underline"
							>
								{token.text}
							</a>
						);
					case "taskKey":
						return (
							<Link
								key={key}
								to="/orgs/$orgSlug/$shortId"
								params={{ orgSlug, shortId: String(token.shortId) }}
								className="whitespace-nowrap rounded-[5px] bg-portal-neutral-soft px-1.5 py-px font-semibold text-[12.5px] text-portal-fg-2 transition-colors hover:text-portal-fg focus-visible:text-portal-fg"
							>
								{token.key}
							</Link>
						);
				}
			})}
		</>
	);
}

/**
 * A release's notes: section headings as small uppercase eyebrows, bullets, paragraphs, and `(SAY-69)` task keys
 * linked to the post they came from.
 */
export function ReleaseNotes({ markdown, orgPrefix, orgSlug, className }: ReleaseNotesProps) {
	const blocks = parseReleaseNotes(markdown, orgPrefix);
	if (blocks.length === 0) return null;

	return (
		<div className={cn("text-[15px] text-portal-fg leading-6", className)}>
			{blocks.map((block, index) => {
				const key = `${block.type}-${index}`;
				if (block.type === "heading") {
					return (
						<h4
							key={key}
							className="mt-5 mb-2 font-semibold text-portal-fg-3 text-xs uppercase leading-4 tracking-[0.04em] first:mt-0"
						>
							{block.text}
						</h4>
					);
				}
				if (block.type === "list") {
					return (
						<ul key={key} className="mb-1">
							{block.items.map((item, itemIndex) => (
								<li
									// biome-ignore lint/suspicious/noArrayIndexKey: static list parsed from markdown
									key={itemIndex}
									className="relative mb-2 pl-5 before:absolute before:top-2.5 before:left-1.5 before:size-[5px] before:rounded-full before:bg-portal-fg-3 before:content-['']"
								>
									<Inline tokens={item} orgSlug={orgSlug} />
								</li>
							))}
						</ul>
					);
				}
				return (
					<p key={key} className="mb-3 text-portal-fg-2">
						<Inline tokens={block.inline} orgSlug={orgSlug} />
					</p>
				);
			})}
		</div>
	);
}
