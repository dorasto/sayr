"use client";
import TasqIcon from "@repo/ui/components/brand-icon";
import { Button } from "@repo/ui/components/button";
import { SidebarTrigger } from "@repo/ui/components/doras-ui/sidebar";
import { Separator } from "@repo/ui/components/separator";

export default function SidebarSection({ sidebarIsOpen, isMobile }: { sidebarIsOpen: boolean; isMobile: boolean }) {
	return (
		<>
			{(!sidebarIsOpen || isMobile) && (
				<>
					<SidebarTrigger sidebarId="primary-sidebar" />
					<Separator orientation="vertical" />
				</>
			)}
			<Button
				variant={"ghost"}
				className="justify-start pl-0 font-bold gap-1 text-muted-foreground [&_svg]:text-primary h-9 hover:bg-primary hover:[&_svg]:text-primary-foreground hover:text-primary-foreground transition-all"
			>
				<TasqIcon className="not-dark:hidden size-8! transition-all" />
				<TasqIcon className="dark:hidden size-8! transition-all" />
				<span className="text-inherit">sayr.io</span>
			</Button>
		</>
	);
}
