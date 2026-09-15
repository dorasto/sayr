import { createFileRoute, redirect } from "@tanstack/react-router";

// /mine is superseded by /home (the unified cross-org lander, SAY-73) —
// this route now only redirects there. Kept as a route (not deleted)
// so old bookmarks/links still land somewhere real.
export const Route = createFileRoute("/(admin)/mine")({
	loader: () => {
		throw redirect({ to: "/home" });
	},
});
