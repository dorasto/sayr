import { splitHighlight } from "@/lib/portal/search";

interface HighlightProps {
	text: string;
	query: string;
}

/** `<mark>` around the part of `text` that matches the query. */
export function Highlight({ text, query }: HighlightProps) {
	return (
		<>
			{splitHighlight(text, query).map((segment, index) =>
				segment.match ? (
					<mark
						// biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
						key={index}
						className="rounded-[3px] bg-primary/15 px-px text-primary"
					>
						{segment.text}
					</mark>
				) : (
					// biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
					<span key={index}>{segment.text}</span>
				)
			)}
		</>
	);
}
