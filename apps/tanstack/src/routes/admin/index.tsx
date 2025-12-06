import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
	component: AdminComponent,
});

function AdminComponent() {
	return (
		<div className="p-2">
			<h3>Admin Dashboard</h3>
			<p>This route is accessed via the 'admin' subdomain!</p>
		</div>
	);
}
