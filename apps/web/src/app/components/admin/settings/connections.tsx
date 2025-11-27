"use client";

import { authClient } from "@repo/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { IconBrandGithub, IconBrandGithubFilled } from "@tabler/icons-react";
import Image from "next/image";
import { useLayoutData } from "@/app/admin/Context";
import type { DorasUserType, GithubUserType } from "@/app/admin/settings/connections/page";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";

interface Props {
	githubUser: GithubUserType | null | undefined;
	dorasUser: DorasUserType | null | undefined;
}

export default function UserConnections({ githubUser, dorasUser }: Props) {
	const { ws } = useLayoutData();
	useWebSocketSubscription({ ws });

	/** ✅ true if both are connected */
	const bothConnected = !!githubUser && !!dorasUser;

	return (
		<div className="flex flex-col gap-2">
			{/* --- Doras connection --- */}
			<div className="bg-card rounded-lg flex flex-col">
				<Tile className="md:w-full">
					<TileHeader>
						<TileIcon className="size-10 bg-transparent relative p-0 overflow-hidden">
							<div className="absolute z-50 -bottom-0.5 -right-0.5 bg-accent p-0.5 rounded-xl">
								<Image
									src={"https://cdn.doras.to/doras/icon-white.svg"}
									alt="Doras logo"
									width={16}
									height={16}
								/>
							</div>
							<Avatar className="w-full h-full rounded-md">
								<AvatarImage
									src={dorasUser?.pic || ""}
									alt={dorasUser?.displayname || ""}
									className="rounded-none"
								/>
								<AvatarFallback className="rounded-md uppercase text-xs">
									<Image
										src={"https://cdn.doras.to/doras/icon-white.svg"}
										alt="Doras logo"
										width={20}
										height={20}
									/>
								</AvatarFallback>
							</Avatar>
						</TileIcon>
						<TileTitle>Doras</TileTitle>
						<TileDescription className="text-xs">
							{dorasUser?.displayname
								? `${dorasUser.displayname} - (${dorasUser.username})`
								: "Connect to sync activity"}
						</TileDescription>
					</TileHeader>

					<TileAction>
						{dorasUser === null ? (
							<Button
								variant="accent"
								size="sm"
								onClick={async () => {
									await authClient.oauth2.link({
										providerId: "doras",
										callbackURL: "/admin/settings/connections",
									});
								}}
							>
								Connect Doras
							</Button>
						) : (
							<Button
								variant="accent"
								size="sm"
								disabled={!bothConnected} // 🔒 Only allow disconnect if both linked
								title={bothConnected ? "Disconnect Doras" : "You must connect GitHub first to disconnect Doras"}
								onClick={async () => {
									await authClient.unlinkAccount({ providerId: "doras" });
									window.location.reload();
								}}
							>
								Disconnect
							</Button>
						)}
					</TileAction>
				</Tile>
			</div>

			{/* --- GitHub connection --- */}
			<div className="bg-card rounded-lg flex flex-col">
				<Tile className="md:w-full">
					<TileHeader>
						<TileIcon className="size-10 bg-transparent relative p-0 overflow-hidden">
							<div className="absolute z-50 -bottom-0.5 -right-0.5 bg-accent p-0.5 rounded-xl">
								<IconBrandGithubFilled className="size-4! mx-auto my-auto" />
							</div>
							<Avatar className="w-full h-full rounded-md">
								<AvatarImage
									src={githubUser?.avatar_url || ""}
									alt={githubUser?.name || ""}
									className="rounded-none"
								/>
								<AvatarFallback className="rounded-md uppercase text-xs">
									<IconBrandGithub className="w-full!" />
								</AvatarFallback>
							</Avatar>
						</TileIcon>
						<TileTitle>GitHub</TileTitle>
						<TileDescription className="text-xs">
							{githubUser?.name ? `${githubUser.name} - (${githubUser.login})` : "Connect to sync activity"}
						</TileDescription>
					</TileHeader>

					<TileAction>
						{githubUser === null ? (
							<Button
								variant="accent"
								size="sm"
								onClick={async () => {
									await authClient.linkSocial({
										provider: "github",
										callbackURL: "/admin/settings/connections",
									});
								}}
							>
								Connect GitHub
							</Button>
						) : (
							<Button
								variant="accent"
								size="sm"
								disabled={!bothConnected} // 🔒 Only allow disconnect if both linked
								title={
									bothConnected ? "Disconnect GitHub" : "You must connect Doras first to disconnect GitHub"
								}
								onClick={async () => {
									await authClient.unlinkAccount({ providerId: "github" });
									window.location.reload();
								}}
							>
								Disconnect
							</Button>
						)}
					</TileAction>
				</Tile>
			</div>
		</div>
	);
}
