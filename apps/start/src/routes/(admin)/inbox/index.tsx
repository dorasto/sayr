import { createFileRoute } from "@tanstack/react-router";
import InboxPage from "@/components/pages/admin/inbox";

export const Route = createFileRoute("/(admin)/inbox/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <InboxPage />;
}
