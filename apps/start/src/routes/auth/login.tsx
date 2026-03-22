import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { LoginComponent } from "@/components/auth/login";
import { getAccess } from "@/getAccess";
import { seo, getOgImageUrl } from "@/seo";

const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const { account } = await getAccess();
  return { account };
});

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: seo({
      title: "Sign in",
      image: getOgImageUrl({ type: "simple", title: "Sign in" }),
    }),
  }),
  component: RouteComponent,
  beforeLoad: async () => {
    const { account } = await checkAuth();
    if (account) {
      throw redirect({ to: "/" });
    }
  },
});

function RouteComponent() {
  return (
    <div>
      <LoginComponent />
    </div>
  )
}
