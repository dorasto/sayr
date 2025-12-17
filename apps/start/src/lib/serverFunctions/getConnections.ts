import { auth, db } from "@repo/database";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getAccess } from "@/getAccess";
import { getUserInfoDoras, getUserInfoGithub } from "@/lib/fetches/connections";
import type { DorasUserType, GithubUserType } from "@/types";

export const getConnections = createServerFn({ method: "GET" }).handler(
	async () => {
		try {
			const { account } = await getAccess();
			// Find GitHub account association for this user
			const github = await db.query.account.findFirst({
				where: and(
					eq(auth.account.userId, account?.id),
					eq(auth.account.providerId, "github"),
				),
			});
			const doras = await db.query.account.findFirst({
				where: and(
					eq(auth.account.userId, account?.id),
					eq(auth.account.providerId, "doras"),
				),
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
			throw redirect({ to: "/admin" });
		}
	},
);
