"use client";

import { authClient } from "@repo/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { IconBrandGithub, IconBrandGithubFilled, IconMail } from "@tabler/icons-react";
import { useLayoutData } from "@/components/generic/Context";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import type { DorasUserType, GithubUserType } from "@/types";
import { schema } from "@repo/database";
import { useToastAction } from "@/lib/util";

interface Props {
	email: schema.accountType | null | undefined;
	githubUser: GithubUserType | null | undefined;
	dorasUser: DorasUserType | null | undefined;
}

export default function UserConnections({ email, githubUser, dorasUser }: Props) {
	const connectedCount = (email ? 1 : 0) + (githubUser ? 1 : 0) + (dorasUser ? 1 : 0);
	const canDisconnect = connectedCount >= 2;
	const { ws, account } = useLayoutData();
	useWebSocketSubscription({ ws });
	const { runWithToast } = useToastAction();
	async function handleRequestPasswordEmail() {
		await runWithToast(
			"request-password-reset",
			{
				loading: {
					title: "Sending email...",
					description: "Requesting password reset link.",
				},
				success: {
					title: "Email sent",
					description: "Check your inbox for the reset link.",
				},
				error: {
					title: "Failed",
					description: "Could not send password reset email.",
				},
			},
			// ⬇️ Adapt the return type so TS is happy
			async () => {
				await authClient.requestPasswordReset({
					email: emailAddress,
					redirectTo: "/auth/password-reset"
				});
				// Return something compatible with what runWithToast expects.
				// You don't actually use it, so a dummy object is fine.
				return {
					success: true,
				} as any;
			},
		);
	}
	const hasEmail = !!email;
	const emailAddress = account.email
	return (
		<div className="flex flex-col gap-2">
			{/* --- Email connection --- */}
			<div className="bg-card rounded-lg flex flex-col">
				<Tile className="md:w-full">
					<TileHeader>
						<TileIcon className="size-10 bg-transparent relative p-0 overflow-hidden">
							<Avatar className="w-full h-full rounded-md">
								<AvatarFallback className="rounded-md uppercase text-xs">
									<IconMail className="size-5" />
								</AvatarFallback>
							</Avatar>
						</TileIcon>
						<TileTitle>Email</TileTitle>
						<TileDescription className="text-xs">
							{hasEmail
								? emailAddress
								: "Connect an email/password login for this account"}
						</TileDescription>
					</TileHeader>

					<TileAction>
						{!hasEmail ? (
							<Button
								variant="accent"
								size="sm"
								onClick={handleRequestPasswordEmail}
							>
								Enable Password for ({account.email})
							</Button>
						) : (
							<div className="flex gap-2">
								<Button
									variant="accent"
									size="sm"
									disabled={!canDisconnect}
									title={
										canDisconnect
											? "Disconnect email login"
											: "You must have at least one other connection to disconnect email"
									}
									onClick={async () => {
										await authClient.unlinkAccount({ providerId: "credential" });
										window.location.reload();
									}}
								>
									Disconnect
								</Button>
							</div>
						)}
					</TileAction>
				</Tile>
			</div>
			{/* --- Doras connection --- */}
			<div className="bg-card rounded-lg flex flex-col">
				<Tile className="md:w-full">
					<TileHeader>
						<TileIcon className="size-10 bg-transparent relative p-0 overflow-hidden">
							<div className="absolute z-50 -bottom-0.5 -right-0.5 bg-accent p-0.5 rounded-xl">
								<img
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
									<img
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
										callbackURL: "/settings/connections",
									});
								}}
							>
								Connect Doras
							</Button>
						) : (
							<Button
								variant="accent"
								size="sm"
								disabled={!canDisconnect}
								title={
									canDisconnect
										? "Disconnect Doras"
										: "You must have at least one other connection to disconnect Doras"
								}
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
								<IconBrandGithubFilled className="size-4" />
							</div>
							<Avatar className="w-full h-full rounded-md">
								<AvatarImage
									src={githubUser?.avatar_url || ""}
									alt={githubUser?.login || ""}
									className="rounded-none"
								/>
								<AvatarFallback className="rounded-md uppercase text-xs">
									<IconBrandGithub className="size-5" />
								</AvatarFallback>
							</Avatar>
						</TileIcon>
						<TileTitle>GitHub</TileTitle>
						<TileDescription className="text-xs">
							{githubUser?.login ? `${githubUser.name} - (${githubUser.login})` : "Connect to sync activity"}
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
										callbackURL: "/settings/connections",
									});
								}}
							>
								Connect GitHub
							</Button>
						) : (
							<Button
								variant="accent"
								size="sm"
								disabled={!canDisconnect} // 🔒 Only allow disconnect if both linked
								title={
									canDisconnect ? "Disconnect GitHub" : "You must connect Doras first to disconnect GitHub"
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
