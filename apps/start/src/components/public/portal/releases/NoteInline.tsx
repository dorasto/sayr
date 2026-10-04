import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import type { ReleaseNoteInline } from "@/lib/portal/release-notes";

interface NoteInlineProps {
	tokens: ReadonlyArray<ReleaseNoteInline>;
	orgSlug: string;
}

/** One line of release-note text: plain text, bold, inline code, external links and `SAY-69` task keys. */
export function NoteInline({ tokens, orgSlug }: NoteInlineProps) {
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
							<code key={key} className="rounded-md bg-muted px-1.5 py-px font-mono text-[0.88em]">
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
								className="font-medium text-primary hover:underline focus-visible:underline"
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
								className="whitespace-nowrap rounded-md bg-muted px-1.5 py-px font-semibold text-[12.5px] text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
							>
								{token.key}
							</Link>
						);
				}
			})}
		</>
	);
}
