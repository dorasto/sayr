import { createFileRoute } from "@tanstack/react-router";

// Never actually renders — the parent route's loader (route.tsx) always
// redirects to /home before this loads. Kept as a trivial pass-through
// only because file-based route codegen wants a valid component here.
export const Route = createFileRoute("/(admin)/mine/")({
	component: () => null,
});
