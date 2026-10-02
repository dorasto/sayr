import { cn } from "@repo/ui/lib/utils";
import RenderIcon from "@/components/generic/RenderIcon";

interface CategoryTagProps {
	category: { name: string; color?: string | null; icon?: string | null };
	className?: string;
}

/** Read-only category: an 18px icon tile tinted from the category colour, then the name. */
export function CategoryTag({ category, className }: CategoryTagProps) {
	const color = category.color || "currentColor";

	return (
		<span
			className={cn("inline-flex items-center gap-[7px] whitespace-nowrap text-[13px] text-portal-fg-2", className)}
		>
			<span
				aria-hidden
				className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px]"
				style={{ background: `color-mix(in oklch, ${color} 18%, transparent)`, color }}
			>
				<RenderIcon iconName={category.icon || "IconCategory"} size={12} raw color={color} />
			</span>
			{category.name}
		</span>
	);
}
