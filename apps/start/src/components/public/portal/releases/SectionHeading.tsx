interface SectionHeadingProps {
	children: string;
	/** Shown as a muted number after the heading when set. */
	count?: number;
}

/** Release page section title ("Release notes", "What is in it", "Discussion") with an optional count. */
export function SectionHeading({ children, count }: SectionHeadingProps) {
	return (
		<h2 className="mb-4 font-semibold text-foreground text-xl leading-7 tracking-[-0.018em]">
			{children}
			{count !== undefined && (
				<span className="ml-2 font-medium text-muted-foreground text-sm tracking-normal">{count}</span>
			)}
		</h2>
	);
}
