import { cn } from "@repo/ui/lib/utils";
import { IconRocket } from "@tabler/icons-react";

interface ReleaseTagProps {
	/** Release name, e.g. "0.7.0". */
	name: string;
	className?: string;
}

/** Read-only release reference: rocket icon and the release name. */
export function ReleaseTag({ name, className }: ReleaseTagProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-muted-foreground",
				className
			)}
		>
			<IconRocket aria-hidden className="size-3.5 shrink-0" />
			{name}
		</span>
	);
}
