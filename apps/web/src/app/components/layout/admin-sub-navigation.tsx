"use client";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { SidebarToggle } from "@repo/ui/components/custom-sidebar-localstorage";
import { Separator } from "@repo/ui/components/separator";
import useLocalStorage from "@repo/ui/hooks/useLocalStorage.ts";

import { HomeIcon } from "lucide-react";

export default function AdminSubNavigation() {
	const { value: sidebarIsOpen } = useLocalStorage(`left-sidebar-state`, false);
	return (
		<header className="bg-sidebar sticky top-0 z-50 flex w-full items-center border-b">
			<div className="flex h-(--header-height) w-full items-center gap-2 p-2">
				{!sidebarIsOpen && (
					<>
						<SidebarToggle name="left-sidebar" />
						<Separator orientation="vertical" />
					</>
				)}

				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="#" className="flex items-center gap-1">
								<HomeIcon size={16} aria-hidden="true" />
								Home
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator> / </BreadcrumbSeparator>
						<BreadcrumbItem>
							<BreadcrumbLink href="#">Components</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator> / </BreadcrumbSeparator>
						<BreadcrumbItem>
							<BreadcrumbPage>Breadcrumb</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>
		</header>
	);
}
