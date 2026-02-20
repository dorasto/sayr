import { getOrganization, getTaskById, type schema } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";

export const getTaskByIdForInbox = createServerFn({ method: "GET" })
	.inputValidator((data: { accountId: string; orgId: string; taskId: string }) => data)
	.handler(async ({ data }) => {
		const { accountId, orgId, taskId } = data;
		if (!orgId || !taskId) {
			return { task: null };
		}
		const organization = await getOrganization(orgId, accountId);
		if (!organization) {
			return { task: null };
		}
		const task = await getTaskById(organization.id, taskId);
		if (!task) {
			return { task: null };
		}
		return {
			task: {
				...task,
				organization: {
					id: organization.id,
					name: organization.name,
					slug: organization.slug,
					logo: organization.logo,
				},
			} as schema.TaskWithLabels,
		};
	});
