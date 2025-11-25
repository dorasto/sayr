"use client";

import { authClient } from "@repo/auth/client";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Input } from "@repo/ui/components/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@repo/ui/components/input-group";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { IconBrandGithub, IconBrandGithubFilled, IconCheck, IconUser, IconUsers } from "@tabler/icons-react";
import { useLayoutData } from "@/app/admin/Context";
import type { GithubUserType } from "@/app/admin/settings/connections/page";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import { ThemeToggle } from "../../theme-toggle";

interface Props {
	githubUser: GithubUserType | null | undefined;
}

export default function UserConnections({ githubUser }: Props) {
	const { ws } = useLayoutData();
	useWebSocketSubscription({
		ws,
	});
	return (
		<div className="bg-card rounded-lg flex flex-col">
			<Tile className="md:w-full">
				<TileHeader>
					<TileIcon className="size-10 bg-transparent relative p-0 overflow-hidden">
						<div className="absolute z-50 -bottom-0.5 -right-0.5 bg-accent p-0.5 rounded-xl">
							<IconBrandGithubFilled className="size-4! mx-auto my-auto" />
						</div>
						<Avatar className="w-full h-full rounded-md">
							<AvatarImage
								// github organization image
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
							variant={"accent"}
							size={"sm"}
							onClick={async () => {
								await authClient.linkSocial({
									provider: "github", // Provider to link
									callbackURL: "/admin/settings/connections", // Callback URL after linking completes
								});
							}}
						>
							Connect
						</Button>
					) : (
						<Button
							variant={"accent"}
							size={"sm"}
							onClick={async () => {
								await authClient.unlinkAccount({
									providerId: "github", // Provider to link
								});
								window.location.reload();
							}}
						>
							Disconnect
						</Button>
					)}
				</TileAction>
			</Tile>
		</div>
	);
}
