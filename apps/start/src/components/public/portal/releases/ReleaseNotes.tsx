import { parseReleaseNotes } from "@/lib/portal/release-notes";
import { NoteInline } from "./NoteInline";

interface ReleaseNotesProps {
	markdown: string | null;
	orgPrefix: string;
	orgSlug: string;
}

/**
 * A release's notes: section headings as small uppercase eyebrows, bullets, paragraphs, and `(SAY-69)` task keys
 * linked to the post they came from.
 */
export function ReleaseNotes({ markdown, orgPrefix, orgSlug }: ReleaseNotesProps) {
	const blocks = parseReleaseNotes(markdown, orgPrefix);
	if (blocks.length === 0) return null;

	return (
		<div className="text-[15px] text-foreground leading-6">
			{blocks.map((block, index) => {
				const key = `${block.type}-${index}`;
				if (block.type === "heading") {
					return (
						<h4
							key={key}
							className="mt-5 mb-2 font-semibold text-muted-foreground text-xs uppercase leading-4 tracking-[0.04em] first:mt-0"
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
									className="relative mb-2 pl-5"
								>
									<span
										aria-hidden
										className="absolute top-2.5 left-1.5 size-[5px] rounded-full bg-muted-foreground"
									/>
									<NoteInline tokens={item} orgSlug={orgSlug} />
								</li>
							))}
						</ul>
					);
				}
				return (
					<p key={key} className="mb-3 text-muted-foreground">
						<NoteInline tokens={block.inline} orgSlug={orgSlug} />
					</p>
				);
			})}
		</div>
	);
}
