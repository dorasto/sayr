import { createFileRoute } from "@tanstack/react-router";
import { LoginComponent } from "@/components/auth/login";

export const Route = createFileRoute("/login/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			<LoginComponent />
		</div>
	)
}
