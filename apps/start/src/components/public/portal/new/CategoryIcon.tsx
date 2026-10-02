import type { schema } from "@repo/database";
import RenderIcon from "@/components/generic/RenderIcon";

interface CategoryIconProps {
	category: schema.categoryType;
}

/** A category's icon in its own colour, for the new post form's kind chips. */
export function CategoryIcon({ category }: CategoryIconProps) {
	return (
		<span aria-hidden className="flex" style={{ color: category.color || undefined }}>
			<RenderIcon iconName={category.icon || "IconCategory"} size={16} raw color={category.color || undefined} />
		</span>
	);
}
