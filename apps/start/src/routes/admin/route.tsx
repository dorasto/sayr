import { createFileRoute, Outlet } from "@tanstack/react-router";
import AdminNavigation from "@/components/generic/AdminNavigation";
import { RootProvider } from "@/components/generic/Context";
import { NavigationTracker } from "@/components/generic/NavigationTracker";
import { Wrapper } from "@/components/generic/wrapper";
import { getAccessWithOrganizations } from "@/lib/serverFunctions/getAccessWithOrganizations";

export const Route = createFileRoute("/admin")({
	loader: () => getAccessWithOrganizations(),
	component: AdminLayout,
});

function AdminLayout() {
	const { account, organizations } = Route.useLoaderData();
	return (
		<div className="flex h-dvh max-h-dvh flex-col bg-sidebar overflow-hidden">
			<RootProvider account={account} organizations={organizations}>
				<NavigationTracker />
				<AdminNavigation />
				<Wrapper>
					<div className="relative h-full max-h-full">
						<Outlet />
					</div>
				</Wrapper>
			</RootProvider>
		</div>
	);
}
