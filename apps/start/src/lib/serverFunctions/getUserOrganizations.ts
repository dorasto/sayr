import { getOrganizations } from "@repo/database";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getAccess } from "@/getAccess";

/**
 * Combined server function to get both access and organizations in one call.
 * This is more efficient for loaders that need both.
 */
export const getUserOrganizations = createServerFn({ method: "GET" }).handler(
	async () => {
		try {
			const { account } = await getAccess();
			const organizations = await getOrganizations(account.id);
			return { account, organizations };
		} catch (error) {
			console.log("🚀 ~ error:", error);
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/home/login" });
		}
	},
);
