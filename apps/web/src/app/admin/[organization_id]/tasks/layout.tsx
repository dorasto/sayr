import { getOrganization, getTasksByOrganizationId } from "@repo/database";
import { redirect } from "next/navigation";
import type React from "react";
import { getAccess } from "@/app/lib/serverFunctions";
import { RootProviderOrganizationTasks } from "./Context";

export default async function RootLayoutOrganizationProject({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{
		organization_id: string;
		project_id: string;
	}>;
}>) {
	const { organization_id } = await params;
	const { account } = await getAccess();
	const organization = await getOrganization(organization_id, account.id);
	if (!organization) {
		return redirect("/admin");
	}
	const tasks = await getTasksByOrganizationId(organization.id);
	return <RootProviderOrganizationTasks tasks={tasks}>{children}</RootProviderOrganizationTasks>;
}
