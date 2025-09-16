"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { TabbedDialog, TabbedDialogFooter, TabPanel } from "@repo/ui/components/tomui/tabbed-dialog";
import { IconUser } from "@tabler/icons-react";
import { useLayoutData } from "@/app/admin/Context";
import ProfileUpdate from "./profile";

interface UserUpdateProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UserUpdate({ isOpen, onOpenChange }: UserUpdateProps) {
	const { account } = useLayoutData();
	const options = [
		{
			id: "general",
			label: account.name,
			title: "Your account",

			icon: (
				<Avatar className="h-4 w-4 rounded-lg">
					<AvatarImage src={account.image || ""} alt={account.name} />
					<AvatarFallback className="rounded-lg uppercase">{account.name.slice(0, 2)}</AvatarFallback>
				</Avatar>
			),
			// footer: (
			// 	<TabbedDialogFooter
			// 		onCancel={() => onOpenChange(false)}
			// 		onSubmit={() => {
			// 			console.log("Saving general settings...");
			// 			onOpenChange(false);
			// 		}}
			// 		submitLabel="Update"
			// 	/>
			// ),
		},
	];

	return (
		<TabbedDialog
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			title="Settings"
			tabs={options}
			defaultTab="general"
			layout="side"
			size="lg"
		>
			<TabPanel tabId="general">
				<ProfileUpdate />
			</TabPanel>
		</TabbedDialog>
	);
}
