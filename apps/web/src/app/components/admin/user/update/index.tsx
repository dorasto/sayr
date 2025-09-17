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
	const tabs = [
		{
			name: "Your Account",
			items: [
				{
					id: "general",
					label: account.name,
					title: "Account",

					icon: (
						<Avatar className="h-4 w-4 rounded-lg">
							<AvatarImage src={account.image || ""} alt={account.name} />
							<AvatarFallback className="rounded-lg uppercase">{account.name.slice(0, 2)}</AvatarFallback>
						</Avatar>
					),
				},
			],
		},
	];

	return (
		<TabbedDialog
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			title="Settings"
			groupedTabs={tabs}
			defaultTab="general"
			layout="side"
			size="lg"
			showTitle={false}
		>
			<TabPanel tabId="general">
				<ProfileUpdate />
			</TabPanel>
		</TabbedDialog>
	);
}
