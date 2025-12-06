import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RootProvider } from "@/components/generic/Context";
import { getAccessWithOrganizations } from "@/lib/serverFunctions/getAccessWithOrganizations";

export const Route = createFileRoute("/admin")({
	loader: () => getAccessWithOrganizations(),
	component: AdminLayout,
});

function AdminLayout() {
	const { account, organizations } = Route.useLoaderData();
	return (
		<RootProvider account={account} organizations={organizations}>
			<div className="admin-layout min-h-screen bg-gray-100">
				<header className="p-4 bg-white shadow-sm border-b">
					<div className="container mx-auto">
						<h1 className="text-xl font-bold text-red-600">Admin {account.name}</h1>
					</div>
				</header>
				<main className="container mx-auto p-4">
					<Outlet />
				</main>
			</div>
		</RootProvider>
	);
}
