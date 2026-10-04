import type { schema } from "@repo/database";
import { Tile, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { cn } from "@repo/ui/lib/utils";
import { generateSlug } from "@repo/util";
import { IconCategory } from "@tabler/icons-react";
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
		<Tile className="flex-col items-stretch gap-3 md:w-full">
			<TileHeader className="w-full">
				<TileIcon>
					<IconCategory />
				</TileIcon>
				<TileTitle className="text-sm">Browse by category</TileTitle>
			</TileHeader>
			<ul className="flex flex-col gap-0.5">
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
									"flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-transparent px-1.5 text-left outline-none transition-colors hover:border-border hover:bg-secondary focus-visible:border-border md:h-8",
									active && "border-border bg-secondary"
								)}
							>
								<CategoryTag category={category} className={cn(active && "text-foreground")} />
								{count !== undefined && (
									<span className="text-muted-foreground text-xs tabular-nums">{count}</span>
								)}
							</button>
						</li>
					);
				})}
			</ul>
		</Tile>
	);
}
