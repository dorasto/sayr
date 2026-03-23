import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { LoginComponent } from "@/components/auth/login";
import { getAccess } from "@/getAccess";
import { seo, getOgImageUrl } from "@/seo";

const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
	const { account } = await getAccess();
	return { account };
});

const getOAuthProviders = createServerFn({ method: "GET" }).handler(async () => {
	return {
		github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
		doras: !!(process.env.DORAS_CLIENT_ID && process.env.DORAS_CLIENT_SECRET),
		discord: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
		slack: !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET),
	};
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
	loader: async () => {
		const providers = await getOAuthProviders();
		return { providers };
	},
});

function RouteComponent() {
	const { providers } = Route.useLoaderData();
	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<LoginComponent providers={providers} />
		</div>
	);
}
