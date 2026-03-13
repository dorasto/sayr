import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginComponent } from "@/components/auth/login";

export const Route = createFileRoute("/login/")({
  component: RouteComponent,
  beforeLoad: async () => {
    throw redirect({ href: "https://sayr.io" });
  },
});

function RouteComponent() {
  return (
    <div>
      <LoginComponent />
    </div>
  )
}