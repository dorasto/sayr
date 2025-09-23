import { getOrganization, getProjectById, getTaskByShortId } from "@repo/database";
import { redirect } from "next/navigation";
import type React from "react";
import { getAccess } from "@/app/lib/serverFunctions";
import { RootProviderOrganizationProjectTask } from "./Context";

export default async function RootLayoutOrganizationProjectTask({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{
		organization_id: string;
		project_id: string;
		task_short_id: number;
	}>;
}>) {
	const { organization_id, project_id, task_short_id } = await params;
	const { account } = await getAccess();
	const organization = await getOrganization(organization_id, account.id);
	if (!organization) {
		return redirect("/admin");
	}
	const project = await getProjectById(organization_id, project_id);
	if (!project) {
		return redirect(`/admin/${organization.id}`);
	}
	const task = await getTaskByShortId(organization.id, project.id, task_short_id);
	if (!task) {
		return redirect(`/admin/${organization.id}/${project.id}`);
	}
	return <RootProviderOrganizationProjectTask task={task}>{children}</RootProviderOrganizationProjectTask>;
}
