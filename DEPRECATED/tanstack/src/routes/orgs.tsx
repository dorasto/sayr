import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs")({
	component: OrgsLayout,
});

function OrgsLayout() {
	return (
		<div className="orgs-layout min-h-screen flex">
			<aside className="w-64 bg-slate-800 text-white p-4">
				<div className="font-bold mb-4">Organization</div>
				<nav className="space-y-2">
					<div className="block p-2 hover:bg-slate-700 rounded">Dashboard</div>
					<div className="block p-2 hover:bg-slate-700 rounded">Projects</div>
					<div className="block p-2 hover:bg-slate-700 rounded">Settings</div>
				</nav>
			</aside>
			<main className="flex-1 bg-gray-50">
				<header className="bg-white p-4 shadow-sm border-b">
					<h2 className="font-semibold">Dashboard</h2>
				</header>
				<div className="p-6">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
