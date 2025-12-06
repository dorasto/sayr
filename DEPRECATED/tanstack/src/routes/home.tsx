import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/home")({
	component: HomeLayout,
});

function HomeLayout() {
	return (
		<div className="home-layout">
			<main>
				<Outlet />
			</main>
		</div>
	);
}
