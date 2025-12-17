import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import AdminNavigation from "@/components/generic/AdminNavigation";
import { RootProvider } from "@/components/generic/Context";
import { NavigationTracker } from "@/components/generic/NavigationTracker";
import { Wrapper } from "@/components/generic/wrapper";
import { getUserOrganizations } from "@/lib/serverFunctions/getUserOrganizations";

export const Route = createFileRoute("/admin")({
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/home/login" });
		}
		return await getUserOrganizations({
			data: {
				account: context.account,
			},
		});
	},
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
