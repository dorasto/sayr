import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
	component: AdminLayout,
});

function AdminLayout() {
	return (
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
	);
}
