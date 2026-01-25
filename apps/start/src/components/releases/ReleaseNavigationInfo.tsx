"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Button } from "@repo/ui/components/button";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, extractHslValues } from "@repo/util";
import {
	IconLayoutSidebarRight,
	IconLayoutSidebarRightFilled,
	IconRocket,
	IconSlash,
	IconUsers,
} from "@tabler/icons-react";
import { Link, useMatch } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import RenderIcon from "@/components/generic/RenderIcon";
import { releaseChartsActions, releaseChartsStore } from "@/lib/stores/release-charts-store";

export default function ReleaseNavigationInfo() {
	// Get release from the release detail route (same pattern as TaskNavigationInfo)
	const releaseMatch = useMatch({
		from: "/(admin)/$orgId/releases/$releaseSlug",
		shouldThrow: false,
	});
	const release = releaseMatch?.loaderData?.release;

	// Get organization from parent route
	const orgMatch = useMatch({ from: "/(admin)/$orgId", shouldThrow: false });
	const organization = orgMatch?.loaderData?.organization;

	const isChartsPanelOpen = useStore(releaseChartsStore, (state) => state.isOpen);
	const isMobile = useIsMobile();

	if (!release || !organization) return null;

	return (
		<div className="flex items-center gap-2 text-sm w-full">
			<Breadcrumb>
				<BreadcrumbList>
					{!isMobile && (
						<>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link to="/$orgId/tasks" params={{ orgId: organization.id }}>
										<Button
											variant={"primary"}
											className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent"
											size={"sm"}
										>
											<Avatar className="h-4 w-4">
												<AvatarImage
													src={organization.logo ? ensureCdnUrl(organization.logo) : ""}
													alt={organization.name}
												/>
												<AvatarFallback className="rounded-md uppercase text-xs">
													<IconUsers className="h-4 w-4" />
												</AvatarFallback>
											</Avatar>
											<span>{organization.name}</span>
										</Button>
									</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator>
								<IconSlash />
							</BreadcrumbSeparator>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link to="/$orgId/releases" params={{ orgId: organization.id }}>
										<Button
											variant={"ghost"}
											className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent"
											size={"sm"}
										>
											<IconRocket className="size-3.5 text-muted-foreground" />
											<span>Releases</span>
										</Button>
									</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator>
								<IconSlash />
							</BreadcrumbSeparator>
						</>
					)}
					<BreadcrumbItem>
						<BreadcrumbPage className="flex items-center gap-2">
							<div
								className="p-1 rounded-lg shrink-0"
								style={{
									background: release.color ? `hsla(${extractHslValues(release.color)}, 0.2)` : undefined,
								}}
							>
								<RenderIcon
									iconName={release.icon || "IconRocket"}
									size={8}
									color={release.color || undefined}
									raw
								/>
							</div>
							<span className="font-semibold text-xs truncate">
								{release.name} <span className="text-muted-foreground font-mono">({release.slug})</span>
							</span>
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Toggle Button */}
			<Button
				variant="accent"
				className={cn("gap-2 h-6 w-fit bg-accent border-transparent p-1 ml-auto")}
				onClick={() => releaseChartsActions.toggle()}
			>
				{isChartsPanelOpen ? (
					<IconLayoutSidebarRightFilled className="w-3 h-3" />
				) : (
					<IconLayoutSidebarRight className="w-3 h-3" />
				)}
			</Button>
		</div>
	);
}
