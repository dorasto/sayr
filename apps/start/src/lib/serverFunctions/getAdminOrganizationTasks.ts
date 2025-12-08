import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { performance } from "node:perf_hooks";

export const getAdminOrganizationTasks = createServerFn({ method: "GET" })
	.inputValidator((data: { orgId: string }) => data)
	.handler(async ({ data }) => {
		const timings: Record<string, number> = {};
		const start = performance.now();

		const { orgId } = data;

		const t0 = performance.now();
		const { getOrganization, getTasksByOrganizationId } = await import("@repo/database");
		const { getAccess } = await import("./getAccess");
		timings.moduleImports = performance.now() - t0;

		try {
			const t1 = performance.now();
			const { account } = await getAccess();
			timings.getAccess = performance.now() - t1;

			if (!orgId) {
				throw redirect({ to: "/admin" });
			}

			const t2 = performance.now();
			const organization = await getOrganization(orgId, account.id);
			timings.getOrganization = performance.now() - t2;

			if (!organization) {
				throw redirect({ to: "/admin" });
			}

			const t3 = performance.now();
			const tasks = await getTasksByOrganizationId(organization.id);
			timings.getTasks = performance.now() - t3;

			timings.total = performance.now() - start;
			console.log("🚀 ~ timings:", timings);
			console.log("______________________________________________________________")

			return { tasks };
		} catch (error) {
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/admin" });
		}
	});
