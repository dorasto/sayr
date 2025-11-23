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
import { IconCheck, IconUser } from "@tabler/icons-react";

export default function UserSettings() {
	return (
		<div className="bg-card rounded-lg flex flex-col">
			<Tile className="md:w-full">
				<TileHeader>
					<TileTitle>Display name</TileTitle>
				</TileHeader>
				<TileAction>
					<InputGroup className="focus-within:bg-card/50 bg-accent border-0 shadow-none transition-all">
						<InputGroupInput placeholder="your name" value={"name"} />

						<InputGroupAddon align="inline-end">
							<IconCheck />
						</InputGroupAddon>
					</InputGroup>
				</TileAction>
			</Tile>
			<Tile className="md:w-full">
				<TileHeader>
					<TileTitle>Profile picture</TileTitle>
				</TileHeader>
				<TileAction>
					<Button variant="accent" size={"icon"}>
						<IconUser />
					</Button>
				</TileAction>
			</Tile>
			<Tile className="md:w-full">
				<TileHeader>
					<TileTitle>Username</TileTitle>
				</TileHeader>
				<TileAction>
					<InputGroup className="focus-within:bg-card/50 bg-accent border-0 shadow-none transition-all">
						<InputGroupInput placeholder="your name" value={"name"} disabled />

						<InputGroupAddon align="inline-end">
							<IconCheck />
						</InputGroupAddon>
					</InputGroup>
				</TileAction>
			</Tile>
			<Tile className="md:w-full">
				<TileHeader>
					<TileTitle>Email address</TileTitle>
				</TileHeader>
				<TileAction>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<InputGroup className="focus-within:bg-card/50 bg-accent border-0 shadow-none transition-all">
								<InputGroupInput placeholder="your name" value={"name"} />
								<InputGroupAddon align="inline-end">
									<IconCheck />
								</InputGroupAddon>
							</InputGroup>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Change your email address</AlertDialogTitle>
								<AlertDialogDescription>
									In order to change you're email, we'll send a confirmation link to your new email address.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<div className="bg-card p-2 rounded-lg">
								<Label className="pl-3">New email address</Label>
								<Input variant={"ghost"} type="email" placeholder="youremail@domain.com" />
							</div>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction>Send</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</TileAction>
			</Tile>
		</div>
	);
}
