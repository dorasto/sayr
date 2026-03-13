import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl } from "@repo/util";
import { IconChevronDown, IconSettings, IconUsers } from "@tabler/icons-react";
import { Link, Outlet, createFileRoute, useLocation, useMatch } from "@tanstack/react-router";
import { useLayoutData } from "@/components/generic/Context";
import { PageHeader } from "@/components/generic/PageHeader";
import { orgSettingsNavigation, settingsNavigation } from "@/lib/routemap";

export const Route = createFileRoute("/(admin)/settings")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex flex-col h-full">
			<SettingsHeader />
			<div className="flex-1 overflow-y-auto">
				<Outlet />
			</div>
		</div>
	);
}

function SettingsHeader() {
	const location = useLocation();
	const pathname = location.pathname;
	const { organizations } = useLayoutData();
	const isMobile = useIsMobile();

	const orgSettingsMatch = useMatch({
		from: "/(admin)/settings/org/$orgId",
		shouldThrow: false,
	});

	const organization = orgSettingsMatch?.loaderData?.organization;
	const orgId = orgSettingsMatch?.params?.orgId;

	// Org settings breadcrumbs
	if (organization && orgId) {
		const baseUrl = `/settings/org/${orgId}`;

		const getCurrentOrgSubPage = () => {
			for (const item of orgSettingsNavigation) {
				const url = item.slug ? `${baseUrl}/${item.slug}` : baseUrl;
				const isActive =
					item.matchType === "includes" ? pathname.includes(url) && pathname !== baseUrl : pathname === url;
				if (isActive) return item;
			}
			if (pathname === baseUrl) return orgSettingsNavigation[0];
			return null;
		};

		const currentOrgSubPage = getCurrentOrgSubPage();

		return (
			<PageHeader>
				<PageHeader.Identity>
					{!isMobile && (
						<>
							<Link to="/settings">
								<Button
									variant={"primary"}
									className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent"
									size={"sm"}
								>
									<IconSettings className="h-4 w-4" />
									<span>Settings</span>
								</Button>
							</Link>
							<span className="text-muted-foreground text-xs">/</span>
						</>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant={"primary"}
								className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent gap-1"
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
								<IconChevronDown className="h-3 w-3" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							{organizations.map((org) => {
								const isCurrentOrg = org.id === orgId;
								return (
									<DropdownMenuItem
										key={org.id}
										asChild
										className={cn(isCurrentOrg ? "font-bold" : "text-muted-foreground")}
									>
										<Link
											to="/settings/org/$orgId"
											params={{ orgId: org.id }}
											className="flex items-center gap-2"
										>
											<Avatar className="h-4 w-4">
												<AvatarImage src={org.logo ? ensureCdnUrl(org.logo) : ""} alt={org.name} />
												<AvatarFallback className="rounded-md uppercase text-xs">
													<IconUsers className="h-4 w-4" />
												</AvatarFallback>
											</Avatar>
											<span>{org.name}</span>
										</Link>
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>
					<span className="text-muted-foreground text-xs">/</span>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant={"primary"}
								className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent gap-1"
								size={"sm"}
							>
								<span>{currentOrgSubPage?.title || "General"}</span>
								<IconChevronDown className="h-3 w-3" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							{orgSettingsNavigation.map((item) => {
								const url = item.slug ? `${baseUrl}/${item.slug}` : baseUrl;
								const isActive =
									item.matchType === "includes"
										? pathname.includes(url) && pathname !== baseUrl
										: pathname === url;
								const Icon = isActive ? item.activeIcon : item.icon;

								return (
									<DropdownMenuItem
										key={item.slug}
										asChild
										className={cn(isActive ? "font-bold" : "text-muted-foreground")}
									>
										<Link to={url} className="flex items-center gap-2">
											<Icon className={cn("h-4 w-4")} />
											<span>{item.title}</span>
										</Link>
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>
				</PageHeader.Identity>
			</PageHeader>
		);
	}

	// Account-level settings breadcrumbs
	const isAccountSettings = pathname === "/settings";
	const isSecuritySettings = pathname === "/settings/security";
	const isConnectionsSettings = pathname === "/settings/connections";

	const currentAccountPage = isAccountSettings
		? settingsNavigation[0]
		: isSecuritySettings
			? settingsNavigation[1]
			: isConnectionsSettings
				? settingsNavigation[2]
				: null;

	return (
		<PageHeader>
			<PageHeader.Identity>
				{!isMobile && (
					<>
						<Link to="/settings">
							<Button
								variant={"primary"}
								className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent"
								size={"sm"}
							>
								<IconSettings className="h-4 w-4" />
								<span>Settings</span>
							</Button>
						</Link>
						<span className="text-muted-foreground text-xs">/</span>
					</>
				)}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant={"primary"}
							className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent gap-1"
							size={"sm"}
						>
							<span>{currentAccountPage?.title || "Settings"}</span>
							<IconChevronDown className="h-3 w-3" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						{settingsNavigation.map((item) => {
							const isActive = pathname === item.url;
							const Icon = isActive ? item.activeIcon : item.icon;

							return (
								<DropdownMenuItem
									key={item.slug}
									asChild
									className={cn(isActive ? "font-bold" : "text-muted-foreground")}
								>
									<Link to={item.url} className="flex items-center gap-2">
										<Icon className={cn("h-4 w-4")} />
										<span>{item.title}</span>
									</Link>
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuContent>
				</DropdownMenu>
			</PageHeader.Identity>
		</PageHeader>
	);
}
