import type { schema } from "@repo/database";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import { generateSlug } from "@repo/util";
import { IconChevronDown, IconFilter, IconSortDescending } from "@tabler/icons-react";
import { type BoardSort, type BoardTab, getTabStatuses } from "@/lib/portal/board-filters";
import { getPortalStatus } from "@/lib/portal/status";
import { portalButtonVariants } from "../ui/PortalButton";
import { PortalTabs } from "../ui/PortalTabs";

const SORT_LABELS: Record<BoardSort, string> = {
	mostPopular: "Most voted",
	newest: "Newest",
	updated: "Recently updated",
};

const STATUS_ORDER = ["backlog", "todo", "in-progress", "done", "canceled"] as const;

const MENU_CONTENT =
	"portal w-56 rounded-portal-lg! border-portal-line-2 bg-portal-surface p-1.5 text-portal-fg shadow-portal-pop!";
const MENU_ITEM =
	"rounded-portal-sm! text-[13.5px] data-highlighted:bg-portal-hover data-highlighted:text-portal-fg focus:bg-portal-hover focus:text-portal-fg";
/** Icon-only on mobile: keep the 44px touch target. */
const TOUCH = "max-md:h-11 max-md:min-w-11 max-md:px-0";
const MENU_LABEL = "px-2 py-1.5 font-semibold text-portal-fg-3 text-xs";

export interface BoardToolbarProps {
	tab: BoardTab;
	onTabChange: (tab: BoardTab) => void;
	/** Tab counts; a missing entry means the count is not exact yet and is hidden. */
	counts: Partial<Record<BoardTab, number>>;
	sort: BoardSort;
	onSortChange: (sort: BoardSort) => void;
	categories: ReadonlyArray<schema.categoryType>;
	categorySlug: string | null;
	onCategoryChange: (slug: string | null) => void;
	labels: ReadonlyArray<schema.labelType>;
	labelIds: ReadonlyArray<string>;
	onLabelToggle: (labelId: string) => void;
	statuses: ReadonlyArray<string>;
	onStatusToggle: (status: string) => void;
	onClearFilters: () => void;
}

/** The tab strip (Active / Done / All with counts), sized to sit in the board's page bar (`BoardPageBar`). */
export function BoardTabs({ tab, onTabChange, counts }: Pick<BoardToolbarProps, "tab" | "onTabChange" | "counts">) {
	return (
		<PortalTabs
			fill
			value={tab}
			onValueChange={(value) => onTabChange(value as BoardTab)}
			className="min-w-0 flex-1 self-stretch"
			items={[
				{ value: "active", label: "Active", count: counts.active },
				{ value: "done", label: "Done", count: counts.done },
				{ value: "all", label: "All", count: counts.all },
			]}
		/>
	);
}

/** The sort and filter menus (icon-only on phones), for the right-hand side of the board's page bar. */
export function BoardToolbarControls({
	tab,
	sort,
	onSortChange,
	categories,
	categorySlug,
	onCategoryChange,
	labels,
	labelIds,
	onLabelToggle,
	statuses,
	onStatusToggle,
	onClearFilters,
}: Omit<BoardToolbarProps, "onTabChange" | "counts">) {
	// Status filter only offers statuses that can appear under the current tab: Done has just one, and Won't do
	// (canceled) is only reachable under All.
	const tabStatuses = getTabStatuses(tab);
	const statusOptions =
		tab === "done" ? [] : STATUS_ORDER.filter((status) => !tabStatuses || tabStatuses.includes(status));
	const activeFilterCount = (categorySlug ? 1 : 0) + labelIds.length + (tab === "done" ? 0 : statuses.length);
	const hasFilterMenu = statusOptions.length > 0 || categories.length > 0 || labels.length > 0;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger className={cn(portalButtonVariants({ variant: "default", size: "sm" }), TOUCH)}>
					<IconSortDescending aria-hidden className="size-3.5" />
					<span className="max-md:sr-only">{SORT_LABELS[sort]}</span>
					<IconChevronDown aria-hidden className="size-3.5 max-md:hidden" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className={MENU_CONTENT}>
					<DropdownMenuLabel className={MENU_LABEL}>Sort by</DropdownMenuLabel>
					<DropdownMenuRadioGroup value={sort} onValueChange={(value) => onSortChange(value as BoardSort)}>
						{(Object.keys(SORT_LABELS) as BoardSort[]).map((value) => (
							<DropdownMenuRadioItem key={value} value={value} className={MENU_ITEM}>
								{SORT_LABELS[value]}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuContent>
			</DropdownMenu>

			{hasFilterMenu && (
				<DropdownMenu>
					<DropdownMenuTrigger
						className={cn(
							portalButtonVariants({ variant: "default", size: "sm" }),
							TOUCH,
							activeFilterCount > 0 && "border-portal-accent-line bg-portal-accent-soft text-portal-accent-ink"
						)}
					>
						<IconFilter aria-hidden className="size-3.5" />
						<span className="max-md:sr-only">Filter</span>
						{activeFilterCount > 0 && <span className="tabular-nums">{activeFilterCount}</span>}
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className={cn(MENU_CONTENT, "max-h-[min(70dvh,480px)]")}>
						{statusOptions.length > 0 && (
							<>
								<DropdownMenuLabel className={MENU_LABEL}>Status</DropdownMenuLabel>
								{statusOptions.map((status) => (
									<DropdownMenuCheckboxItem
										key={status}
										checked={statuses.includes(status)}
										onCheckedChange={() => onStatusToggle(status)}
										className={MENU_ITEM}
									>
										{getPortalStatus(status).label}
									</DropdownMenuCheckboxItem>
								))}
							</>
						)}

						{categories.length > 0 && (
							<>
								{statusOptions.length > 0 && <DropdownMenuSeparator className="bg-portal-line" />}
								<DropdownMenuLabel className={MENU_LABEL}>Category</DropdownMenuLabel>
								<DropdownMenuRadioGroup
									value={categorySlug ?? ""}
									onValueChange={(value) => onCategoryChange(value || null)}
								>
									<DropdownMenuRadioItem value="" className={MENU_ITEM}>
										All categories
									</DropdownMenuRadioItem>
									{categories.map((category) => (
										<DropdownMenuRadioItem
											key={category.id}
											value={generateSlug(category.name)}
											className={MENU_ITEM}
										>
											{category.name}
										</DropdownMenuRadioItem>
									))}
								</DropdownMenuRadioGroup>
							</>
						)}

						{labels.length > 0 && (
							<>
								<DropdownMenuSeparator className="bg-portal-line" />
								<DropdownMenuLabel className={MENU_LABEL}>Label</DropdownMenuLabel>
								{labels.map((label) => (
									<DropdownMenuCheckboxItem
										key={label.id}
										checked={labelIds.includes(label.id)}
										onCheckedChange={() => onLabelToggle(label.id)}
										className={MENU_ITEM}
									>
										{label.name}
									</DropdownMenuCheckboxItem>
								))}
							</>
						)}

						{activeFilterCount > 0 && (
							<>
								<DropdownMenuSeparator className="bg-portal-line" />
								<button
									type="button"
									onClick={onClearFilters}
									className="w-full rounded-portal-sm! px-2 py-1.5 text-left text-[13.5px] text-portal-accent-ink hover:bg-portal-hover focus-visible:bg-portal-hover"
								>
									Clear filters
								</button>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</>
	);
}
