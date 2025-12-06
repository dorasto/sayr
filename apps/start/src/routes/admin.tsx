import { getOrganizations } from "@repo/database";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RootProvider } from "@/components/generic/Context";
import { redirectAuth } from "@/lib/redirectAuth";
import { getAccess } from "@/lib/serverFunctions";

export const Route = createFileRoute("/admin")({
	// loader: async () => {
	// 	const access = await getAccess();
	// 	if (!access?.account) {
	// 		redirectAuth();
	// 	}
	// 	const { account } = access;
	// 	const organizations = await getOrganizations(account.id);
	// 	return { account, organizations };
	// },
	component: AdminLayout,
});

function AdminLayout() {
	// const { account, organizations } = Route.useLoaderData();
	return (
		// <RootProvider account={account} organizations={organizations}>
		<div className="admin-layout min-h-screen bg-gray-100">
			<header className="p-4 bg-white shadow-sm border-b">
				<div className="container mx-auto">
					<h1 className="text-xl font-bold text-red-600">Admin Portal</h1>
				</div>
			</header>
			<main className="container mx-auto p-4">
				<Outlet />
			</main>
		</div>
		// </RootProvider>
	);
}
