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
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Input } from "@repo/ui/components/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@repo/ui/components/input-group";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { IconBrandGithub, IconCheck, IconUser } from "@tabler/icons-react";
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
					<TileIcon className="[&_svg]:size-9">
						<IconBrandGithub className="w-full!" />
					</TileIcon>
					<TileTitle>GitHub</TileTitle>

					<TileDescription className="text-xs">Connect to sync activity</TileDescription>
				</TileHeader>
				{githubUser?.name}
				<TileAction>
					<Button
						variant={"accent"}
						onClick={async () => {
							await authClient.linkSocial({
								provider: "github", // Provider to link
								callbackURL: "/admin/settings/connections", // Callback URL after linking completes
							});
						}}
					>
						Connect
					</Button>
					<Button
						variant={"accent"}
						onClick={async () => {
							await authClient.unlinkAccount({
								providerId: "github", // Provider to link
							});
							window.location.reload();
						}}
					>
						Disconnect
					</Button>
				</TileAction>
			</Tile>
		</div>
	);
}
