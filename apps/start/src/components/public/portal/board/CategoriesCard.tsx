import type { schema } from "@repo/database";
import { Card } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";
import { generateSlug } from "@repo/util";
import { CategoryTag } from "../ui/CategoryTag";
import type { BoardCounts } from "./useBoardSideData";

interface CategoriesCardProps {
	categories: ReadonlyArray<schema.categoryType>;
	counts: BoardCounts | undefined;
	activeSlug: string | null;
	onSelect: (slug: string | null) => void;
}

/** "Browse by category": name and open-post count per row; clicking one filters the board (click again to clear). */
export function CategoriesCard({ categories, counts, activeSlug, onSelect }: CategoriesCardProps) {
	if (categories.length === 0) return null;

	return (
		<Card className="p-5">
			<h3 className="mb-3 font-semibold text-[13px]">Browse by category</h3>
			<ul>
				{categories.map((category) => {
					const slug = generateSlug(category.name);
					const active = activeSlug === slug;
					const count =
						counts?.categories.find((entry) => entry.id === category.id)?.count ?? (counts ? 0 : undefined);
					return (
						<li key={category.id}>
							<button
								type="button"
								aria-pressed={active}
								onClick={() => onSelect(active ? null : slug)}
								className={cn(
									"-mx-2.5 flex h-11 w-[calc(100%+1.25rem)] cursor-pointer items-center justify-between rounded-lg px-2.5 text-left outline-none transition-colors hover:bg-accent md:h-9",
									active && "bg-muted"
								)}
							>
								<CategoryTag category={category} className={cn(active && "text-foreground")} />
								{count !== undefined && (
									<span className="text-[13px] text-muted-foreground tabular-nums">{count}</span>
								)}
							</button>
						</li>
					);
				})}
			</ul>
		</Card>
	);
}
