"use client";

import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { useAdminRoute } from "./admin/admin-navigation/useAdminRoute";
import { PrimarySidebar } from "./admin/sidebars/primary";
import { SettingsSidebar } from "./admin/sidebars/settings";
import { StaffSidebar } from "./admin/sidebars/staff";

interface Props {
	children: React.ReactNode;
	className?: string;
}
export function Wrapper({ children, className }: Props) {
	const { isTaskPage, isSettingsPage, isStaffPage } = useAdminRoute();
	return (
		<div className="h-full w-full max-h-[calc(100dvh-var(--header-height))]!">
			<div className="flex flex-1 h-full w-full transition-all pb-2 pr-2">
				{/* <PrimarySidebar /> */}
				{isSettingsPage ? <SettingsSidebar /> : isStaffPage ? <StaffSidebar /> : <PrimarySidebar />}
				{/* <LeftSidebarProvider /> */}
				<div
					className={cn(
						"h-full overflow-y-auto w-full mx-auto flex flex-col rounded-2xl bg-background contain-layout",
						isTaskPage && "pt-0 pr-0",
						className
					)}
				>
					{children}
				</div>
			</div>
		</div>
	);
}

interface SubProps {
	children: React.ReactNode;
	className?: string;
	style?: "default" | "compact";
	title?: string;
	description?: string;
	icon?: React.ReactNode;
	backButton?: string;
	backButtonText?: string;
}
export function SubWrapper({
	children,
	className,
	style = "default",
	title = "title",
	description,
	icon,
	backButton,
	backButtonText = "Back",
}: SubProps) {
	return (
		<div className="relative">
			<div className="sticky top-0 z-50 w-full md:h-7 bg-gradient-to-b from-background from-0% via-background/50 via-50% to-background/10 flex items-center px-3 pt-3">
				{backButton ? (
					<Link href={backButton} className="">
						<Button
							variant={"ghost"}
							className="w-fit text-xs p-1 h-auto bg-accent md:bg-transparent rounded-lg"
							size={"sm"}
						>
							<IconArrowLeft className="size-3!" />
							<span className="">{backButtonText}</span>
						</Button>
					</Link>
				) : (
					<Button variant={"ghost"} className="w-fit text-xs p-1 h-auto invisible" size={"sm"}>
						<IconArrowLeft className="size-3!" />
						<span className="hidden lg:block">Back</span>
					</Button>
				)}
			</div>
			<div
				className={cn(
					"flex flex-col gap-9",
					style === "compact" && "max-w-prose mx-auto p-3 md:p-6 md:pt-0",
					className
				)}
			>
				<div className="flex flex-col">
					{icon ? (
						<div className="flex gap-2">
							<div className="bg-accent p-1 rounded-lg [&_svg]:size-10! h-fit">{icon}</div>
							<div className="flex flex-col">
								<Label variant={"heading"} className="text-2xl text-foreground">
									{title}
								</Label>
								{description && (
									<Label variant={"subheading"} className="text-muted-foreground">
										{description}
									</Label>
								)}
							</div>
						</div>
					) : (
						<Label variant={"heading"} className="text-2xl text-foreground">
							{title}
						</Label>
					)}

					{!icon && description && (
						<Label variant={"subheading"} className="text-muted-foreground">
							{description}
						</Label>
					)}
				</div>
				{children}
			</div>{" "}
		</div>
	);
}
