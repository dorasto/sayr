"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/app/lib/axiom/server";
import { setUserRole } from "./serverFunctions";

export async function changeUserRoleAction(userId: string, role: "admin" | "user") {
	try {
		logger.info("Changing user role", { userId, role });
		const result = await setUserRole(userId, role);

		// Revalidate the admin console page to refresh the data
		revalidatePath("/admin/console");

		return { success: true, data: result };
	} catch (error) {
		logger.error("Failed to change user role", { error, userId, role });
		console.error("Failed to change user role:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to change user role",
		};
	}
}
