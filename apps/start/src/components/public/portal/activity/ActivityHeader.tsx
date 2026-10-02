import { authClient } from "@repo/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { ensureCdnUrl, getInitials } from "@repo/util";

/** The logged-in viewer, as the Activity page shows them. */
export interface ActivityUser {
	id: string;
	name: string;
	image?: string | null;
}

interface ActivityHeaderProps {
	/** `null` while the session is still loading: the avatar shows a skeleton. */
	user: ActivityUser | null;
	orgName: string;
}

/** Avatar, name and "Log out" above the viewer's activity. */
export function ActivityHeader({ user, orgName }: ActivityHeaderProps) {
	const handleLogOut = async () => {
		await authClient.signOut();
		window.location.reload();
	};

	return (
		<div className="mb-8 flex items-center gap-4 md:mb-9 md:gap-5">
			{user ? (
				<Avatar className="size-16">
					{user.image ? <AvatarImage src={ensureCdnUrl(user.image)} alt={user.name} /> : null}
					<AvatarFallback className="font-semibold text-2xl text-foreground">
						{getInitials(user.name)}
					</AvatarFallback>
				</Avatar>
			) : (
				<Skeleton aria-hidden className="size-16 shrink-0 rounded-full" />
			)}
			<div className="min-w-0 flex-1">
				<h1 className="truncate font-bold text-[24px] leading-[30px] tracking-[-0.028em] md:text-[28px] md:leading-[34px]">
					{user?.name ?? "Your activity"}
				</h1>
				<p className="mt-0.5 text-[15px] text-muted-foreground leading-6">
					Everything you have voted on and posted on {orgName}.
				</p>
			</div>
			{user && (
				<Button variant="outline" onClick={handleLogOut}>
					Log out
				</Button>
			)}
		</div>
	);
}
