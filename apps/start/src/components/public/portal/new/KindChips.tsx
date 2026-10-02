import type { schema } from "@repo/database";
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
import RenderIcon from "@/components/generic/RenderIcon";
import { splitCategoryChips } from "@/lib/portal/new-post";

const CHIP_CLASS =
	"inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-2 rounded-full border pr-3.5 pl-3 font-medium text-sm outline-none transition-colors max-md:h-11";
const MENU_CONTENT =
	"portal w-56 rounded-portal-lg! border-portal-line-2 bg-portal-surface p-1.5 text-portal-fg shadow-portal-pop!";
const MENU_ITEM =
	"rounded-portal-sm! text-[13.5px] data-highlighted:bg-portal-hover data-highlighted:text-portal-fg focus:bg-portal-hover focus:text-portal-fg";

function CategoryIcon({ category }: { category: schema.categoryType }) {
	return (
		<span aria-hidden className="flex" style={{ color: category.color || undefined }}>
			<RenderIcon iconName={category.icon || "IconCategory"} size={16} raw color={category.color || undefined} />
		</span>
	);
}

interface KindChipsProps {
	categories: ReadonlyArray<schema.categoryType>;
	value: string | null;
	onChange: (categoryId: string | null) => void;
}

/**
 * "What kind of post is this?": the org's categories as single-select chips (own icon and colour). Feature request, Bug
 * and Feedback lead when they exist, otherwise the first three; the rest sit behind "Other category". Clicking the
 * selected chip clears it.
 */
export function KindChips({ categories, value, onChange }: KindChipsProps) {
	const { chips, more } = useMemo(() => splitCategoryChips(categories), [categories]);
	const moreSelected = more.find((category) => category.id === value);

	return (
		<fieldset aria-label="Kind of post" className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
			{chips.map((category) => {
				const selected = value === category.id;
				return (
					<button
						key={category.id}
						type="button"
						aria-pressed={selected}
						onClick={() => onChange(selected ? null : category.id)}
						className={cn(
							CHIP_CLASS,
							selected
								? "border-portal-accent-line bg-portal-accent-soft text-portal-accent-ink"
								: "border-portal-line-2 text-portal-fg-2 hover:bg-portal-hover focus-visible:bg-portal-hover hover:text-portal-fg focus-visible:text-portal-fg"
						)}
					>
						<CategoryIcon category={category} />
						{category.name}
					</button>
				);
			})}
			{more.length > 0 && (
				<DropdownMenu>
					<DropdownMenuTrigger
						className={cn(
							CHIP_CLASS,
							"pr-3",
							moreSelected
								? "border-portal-accent-line bg-portal-accent-soft text-portal-accent-ink"
								: "border-portal-line-2 border-dashed text-portal-fg-2 hover:bg-portal-hover focus-visible:bg-portal-hover hover:text-portal-fg focus-visible:text-portal-fg"
						)}
					>
						{moreSelected ? (
							<>
								<CategoryIcon category={moreSelected} />
								{moreSelected.name}
							</>
						) : (
							"Other category"
						)}
						<IconChevronDown aria-hidden className="size-3.5" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className={cn(MENU_CONTENT, "max-h-[min(60dvh,360px)]")}>
						<DropdownMenuRadioGroup
							value={moreSelected?.id ?? ""}
							onValueChange={(next) => onChange(next || null)}
						>
							{more.map((category) => (
								<DropdownMenuRadioItem key={category.id} value={category.id} className={MENU_ITEM}>
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
	);
}
