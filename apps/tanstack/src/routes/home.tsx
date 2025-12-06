import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/home")({
	component: HomeLayout,
});

function HomeLayout() {
	return (
		<div className="home-layout">
			<header className="p-4 bg-slate-900 text-white border-b border-slate-800">
				<div className="container mx-auto flex justify-between items-center">
					<h1 className="text-xl font-bold">Project Tool</h1>
					<nav>
						<a href="/login" className="text-sm hover:text-cyan-400">
							Login
						</a>
					</nav>
				</div>
			</header>
			<main>
				<Outlet />
			</main>
		</div>
	);
}
