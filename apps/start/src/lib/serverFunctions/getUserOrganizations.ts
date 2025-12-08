import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

/**
 * Combined server function to get both access and organizations in one call.
 * This is more efficient for loaders that need both.
 */
export const getUserOrganizations = createServerFn({ method: "GET" }).handler(async () => {
	// Dynamic imports to ensure server-only modules don't leak to client bundle
	const { getAccess } = await import("./getAccess");
	const { getOrganizations } = await import("@repo/database");
	try {
		const { account } = await getAccess();
		const organizations = await getOrganizations(account.id);
		return { account, organizations };
	} catch (error) {
		// If it's already a redirect, re-throw it
		if (error && typeof error === "object" && "redirect" in error) {
			throw error;
		}
		throw redirect({ to: "/home/login" });
	}
});
