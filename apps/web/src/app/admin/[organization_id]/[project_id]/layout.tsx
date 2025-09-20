import { getOrganization, getProjectById, getTasksByProjectId } from "@repo/database";
import { redirect } from "next/navigation";
import type React from "react";
import { getAccess } from "@/app/lib/serverFunctions";
import { RootProviderOrganizationProject } from "./Context";

export default async function RootLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{
		organization_id: string;
		project_id: string;
	}>;
}>) {
	const { organization_id, project_id } = await params;
	const { account } = await getAccess();
	const organization = await getOrganization(organization_id, account.id);
	if (!organization) {
		return redirect("/admin");
	}
	const project = await getProjectById(organization_id, project_id);
	if (!project) {
		return redirect(`/admin/${organization.id}`);
	}
	const tasks = await getTasksByProjectId(organization.id, project.id);
	return (
		<RootProviderOrganizationProject project={project} tasks={tasks}>
			{children}
		</RootProviderOrganizationProject>
	);
}
