"use client";

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
import { ThemeToggle } from "../../theme-toggle";

export default function UserConnections() {
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
				<TileAction>
					<Button variant={"accent"}>Connect</Button>
				</TileAction>
			</Tile>
		</div>
	);
}
