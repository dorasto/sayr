import { getOrganization, getTaskByShortId } from "@repo/database";
import { redirect } from "next/navigation";
import type React from "react";
import { getAccess } from "@/app/lib/serverFunctions";
import { RootProviderOrganizationTask } from "./Context";

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
	const { organization_id, task_short_id } = await params;
	const { account } = await getAccess();
	const organization = await getOrganization(organization_id, account.id);
	if (!organization) {
		return redirect("/admin");
	}
	const task = await getTaskByShortId(organization.id, task_short_id);
	if (!task) {
		return redirect(`/admin/${organization.id}/tasks`);
	}
	return <RootProviderOrganizationTask task={task}>{children}</RootProviderOrganizationTask>;
}
