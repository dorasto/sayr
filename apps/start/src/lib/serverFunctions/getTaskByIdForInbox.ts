import { getOrganization, getTaskById, type schema } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { getAccess } from "@/getAccess";

export const getTaskByIdForInbox = createServerFn({ method: "GET" })
	.inputValidator((data: { orgId: string; taskId: string }) => data)
	.handler(async ({ data }) => {
		const { orgId, taskId } = data;
		const { account } = await getAccess();
		if (!account || !orgId || !taskId) {
			return { task: null };
		}
		const organization = await getOrganization(orgId, account.id, { blockOrgUnseated: true });
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
					shortId: organization.shortId,
				},
			} as schema.TaskWithLabels,
		};
	});
