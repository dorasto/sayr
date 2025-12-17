import { getOrganizations, type schema } from "@repo/database";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

/**
 * Combined server function to get both access and organizations in one call.
 * This is more efficient for loaders that need both.
 */
export const getUserOrganizations = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType }) => data)
	.handler(async ({ data }) => {
		try {
			const organizations = await getOrganizations(data.account.id);
			return { account: data.account, organizations };
		} catch (error) {
			console.log("🚀 ~ error:", error);
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/home/login" });
		}
	});
