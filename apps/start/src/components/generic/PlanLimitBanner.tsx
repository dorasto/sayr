import { Tile, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { IconLock } from "@tabler/icons-react";

interface PlanLimitBannerProps {
	title: string;
	description: string;
}

/**
 * Reusable banner shown when a resource limit has been reached or exceeded.
 * Matches the visual style of the existing seat limit banner on the members page.
 */
export function PlanLimitBanner({ title, description }: PlanLimitBannerProps) {
	return (
		<Tile variant="outline" className="md:w-full border-destructive/30 bg-destructive/5">
			<TileHeader>
				<TileIcon className="bg-destructive/15 border-none">
					<IconLock className="size-6! text-destructive" />
				</TileIcon>
				<TileTitle>{title}</TileTitle>
				<TileDescription>{description}</TileDescription>
			</TileHeader>
		</Tile>
	);
}
