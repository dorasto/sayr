import type { schema } from "@repo/database";
import { Button, buttonVariants } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import { useMemo } from "react";
import { CategoryIcon } from "@/components/public/portal/new/CategoryIcon";
import { splitCategoryChips } from "@/lib/portal/new-post";

interface KindPickerProps {
	categories: schema.categoryType[];
	/** The chosen category id, or `null` for none. */
	value: string | null;
	onChange: (categoryId: string | null) => void;
}

/**
 * "What kind of post is this?": the org's first categories as toggle chips, the rest behind an "Other category"
 * dropdown that shows the chosen one when it is picked from there.
 */
export function KindPicker({ categories, value, onChange }: KindPickerProps) {
	const kindChips = useMemo(() => splitCategoryChips(categories), [categories]);
	const moreCategory = kindChips.more.find((category) => category.id === value);

	return (
		<div>
			<div className="mb-2 flex items-center gap-2 font-semibold text-sm">What kind of post is this?</div>
			<fieldset aria-label="Kind of post" className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
				{kindChips.chips.map((category) => {
					const selected = value === category.id;
					return (
						<Button
							key={category.id}
							variant="outline"
							size="sm"
							aria-pressed={selected}
							onClick={() => onChange(selected ? null : category.id)}
							className={cn(
								"shrink-0 rounded-full pr-3.5 pl-3 max-md:h-11",
								selected
									? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/20"
									: "text-muted-foreground hover:text-foreground"
							)}
						>
							<CategoryIcon category={category} />
							{category.name}
						</Button>
					);
				})}
				{kindChips.more.length > 0 && (
					<DropdownMenu>
						<DropdownMenuTrigger
							className={cn(
								buttonVariants({ variant: "outline", size: "sm" }),
								"shrink-0 rounded-full pr-3 pl-3 max-md:h-11",
								moreCategory
									? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/20"
									: "border-dashed text-muted-foreground hover:text-foreground"
							)}
						>
							{moreCategory ? (
								<>
									<CategoryIcon category={moreCategory} />
									{moreCategory.name}
								</>
							) : (
								"Other category"
							)}
							<IconChevronDown aria-hidden className="size-3.5" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="max-h-[min(60dvh,360px)] w-56">
							<DropdownMenuRadioGroup
								value={moreCategory?.id ?? ""}
								onValueChange={(next) => onChange(next || null)}
							>
								{kindChips.more.map((category) => (
									<DropdownMenuRadioItem key={category.id} value={category.id}>
										<span className="flex items-center gap-2">
											<CategoryIcon category={category} />
											{category.name}
										</span>
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</fieldset>
		</div>
	);
}
