import { Outlet, useMatches } from "react-router";
import { SiteHeader } from "~/components/navigation/header";
import { AppSidebar } from "~/components/navigation/left-sidebar/index";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { BugPageSidebar } from "~/components/navigation/bugpage-sidebar";
import { ThemeProvider } from "~/components/theme-provider";

export default function Layout() {
  const matches = useMatches();
  const showBugPageSidebar = matches.some(
    (match) => match.pathname.startsWith("/bugs/") && match.params.id
  );

  return (
    <ThemeProvider>
      <div className="[--header-height:calc(--spacing(14))]">
        <SidebarProvider className="flex flex-col">
          <SiteHeader />
          <div className="flex flex-1">
            <AppSidebar />
            <SidebarInset>
              <Outlet />
            </SidebarInset>
            {showBugPageSidebar && <BugPageSidebar />}
          </div>
        </SidebarProvider>
      </div>
    </ThemeProvider>
  );
}
