import { LoginComponent } from "@/components/auth/login";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { seo, getOgImageUrl } from "@/seo";

const getOAuthProviders = createServerFn({ method: "GET" }).handler(async () => {
	return {
		github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
		doras: !!(process.env.DORAS_CLIENT_ID && process.env.DORAS_CLIENT_SECRET),
		discord: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
	};
});

export const Route = createFileRoute("/auth/signup")({
	head: () => ({
		meta: seo({
			title: "Sign up",
			image: getOgImageUrl({ type: "simple", title: "Sign up" }),
		}),
	}),
	component: RouteComponent,
	loader: async () => {
		const providers = await getOAuthProviders();
		return { providers };
	},
});

function RouteComponent() {
	const { providers } = Route.useLoaderData();
	return (
		<div>
			<LoginComponent providers={providers} />
		</div>
	);
}
