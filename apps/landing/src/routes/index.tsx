import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-background text-foreground">
			<p>apps/landing scaffold — Phase 1</p>
		</main>
	);
}
