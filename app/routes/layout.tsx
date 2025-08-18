import { Outlet, useMatches } from "react-router";
import { BugPageSidebar } from "~/components/navigation/bugpage-sidebar";
import { SiteHeader } from "~/components/navigation/header";
import { AppSidebar } from "~/components/navigation/left-sidebar/index";
import { ThemeProvider } from "~/components/theme-provider";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

export default function Layout() {
	const matches = useMatches();
	const showBugPageSidebar = matches.some(
		(match) =>
			(match.pathname.startsWith("/bugs/") && match.params.id) ||
			(match.pathname.startsWith("/") && match.params.slug && match.params.id),
	);

	return (
		<ThemeProvider>
			<div className="[--header-height:calc(--spacing(14))]">
				<SidebarProvider className="flex flex-col">
					<SiteHeader />
					<div className="flex flex-1">
						<AppSidebar />
						<SidebarInset className="p-4">
							<Outlet />
						</SidebarInset>
						{showBugPageSidebar && <BugPageSidebar />}
					</div>
				</SidebarProvider>
			</div>
		</ThemeProvider>
	);
}
