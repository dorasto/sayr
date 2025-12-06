import { createFileRoute } from "@tanstack/react-router";
import { authMiddleware } from "../middleware/auth";

export const Route = createFileRoute("/admin/")({
	component: AdminComponent,
	server: {
		middleware: [authMiddleware],
	},
});

function AdminComponent() {
	return (
		<div className="p-2">
			<h3>Admin Dashboard</h3>
			<p>This route is accessed via the 'admin' subdomain!</p>
		</div>
	);
}
