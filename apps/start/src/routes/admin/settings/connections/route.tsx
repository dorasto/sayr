import { auth, db } from "@repo/database";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { getAccess } from "@/getAccess";
import { getUserInfoDoras, getUserInfoGithub } from "@/lib/fetches/connections";
import type { DorasUserType, GithubUserType } from "@/types";

export const Route = createFileRoute("/admin/settings/connections")({
	// loader: async () => {
	// 	const { account } = await getAccess();

	// 	// Find GitHub account association for this user
	// 	const github = await db.query.account.findFirst({
	// 		where: and(
	// 			eq(auth.account.userId, account?.id),
	// 			eq(auth.account.providerId, "github"),
	// 		),
	// 	});
	// 	const doras = await db.query.account.findFirst({
	// 		where: and(
	// 			eq(auth.account.userId, account?.id),
	// 			eq(auth.account.providerId, "doras"),
	// 		),
	// 	});

	// 	let githubUser: GithubUserType | null = null;
	// 	let dorasUser: DorasUserType | null = null;

	// 	if (github?.accessToken) {
	// 		try {
	// 			githubUser = await getUserInfoGithub(github.accessToken);
	// 		} catch (error) {
	// 			console.error("Failed to fetch GitHub user:", error);
	// 		}
	// 	}

	// 	if (doras?.accessToken) {
	// 		try {
	// 			dorasUser = await getUserInfoDoras(doras.accessToken);
	// 		} catch (error) {
	// 			console.error("Failed to fetch Doras user:", error);
	// 		}
	// 	}

	// 	return {
	// 		githubUser,
	// 		dorasUser,
	// 	};
	// },
	// Can't get this working so commenting out for now
	component: RouteComponent,
});

function RouteComponent() {
	return <Outlet />;
}
