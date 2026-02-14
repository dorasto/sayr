import { Label } from "@repo/ui/components/label";
import { createFileRoute, redirect } from "@tanstack/react-router";
import UserConnections from "@/components/pages/admin/settings/connections";
import { auth, db, type schema } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getUserInfoDoras, getUserInfoGithub } from "@/lib/fetches/connections";
import type { DorasUserType, GithubUserType } from "@/types";

export const getConnections = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType }) => data)
	.handler(async ({ data }) => {
		try {
			// Find GitHub account association for this user
			const github = await db.query.account.findFirst({
				where: and(eq(auth.account.userId, data.account?.id), eq(auth.account.providerId, "github")),
			});
			const doras = await db.query.account.findFirst({
				where: and(eq(auth.account.userId, data.account?.id), eq(auth.account.providerId, "doras")),
			});

			let githubUser: GithubUserType | null = null;
			let dorasUser: DorasUserType | null = null;

			if (github?.accessToken) {
				try {
					githubUser = await getUserInfoGithub(github.accessToken);
				} catch (error) {
					console.error("Failed to fetch GitHub user:", error);
				}
			}

			if (doras?.accessToken) {
				try {
					dorasUser = await getUserInfoDoras(doras.accessToken);
				} catch (error) {
					console.error("Failed to fetch Doras user:", error);
				}
			}

			return {
				githubUser,
				dorasUser,
			};
		} catch (error) {
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/" });
		}
	});

export const Route = createFileRoute("/(admin)/settings/connections/")({
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}
		return await getConnections({ data: { account: context.account } });
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { githubUser, dorasUser } = Route.useLoaderData();
	return (
		<div className="max-w-prose mx-auto p-3 md:p-6 w-full flex flex-col gap-9">
			<div className="flex flex-col">
				<Label variant="heading" className="text-2xl text-foreground">Connections</Label>
			</div>
			<UserConnections githubUser={githubUser} dorasUser={dorasUser} />
		</div>
	);
}
