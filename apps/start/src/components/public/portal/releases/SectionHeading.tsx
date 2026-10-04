import { Label } from "@repo/ui/components/label";

interface SectionHeadingProps {
	children: string;
	/** Shown as a muted number after the heading when set (and above zero). */
	count?: number;
}

/** Release page section title ("What's in it", "Discussion"): the same `Label` heading as the post page's Conversation. */
export function SectionHeading({ children, count }: SectionHeadingProps) {
	return (
		<Label variant="heading" className="mb-4 flex items-center gap-2">
			{children}
			{count !== undefined && count > 0 && (
				<span className="font-medium text-muted-foreground text-sm">{count}</span>
			)}
		</Label>
	);
}
