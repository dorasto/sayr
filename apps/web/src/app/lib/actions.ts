"use server";

import { revalidatePath } from "next/cache";
import { setUserRole } from "./serverFunctions";

export async function changeUserRoleAction(userId: string, role: "admin" | "user") {
	try {
		const result = await setUserRole(userId, role);

		// Revalidate the admin console page to refresh the data
		revalidatePath("/admin/console");

		return { success: true, data: result };
	} catch (error) {
		console.error("Failed to change user role:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to change user role",
		};
	}
}
