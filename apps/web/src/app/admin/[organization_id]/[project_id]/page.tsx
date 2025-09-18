import { getOrganization, getProjectById } from "@repo/database";
import { redirect } from "next/navigation";
import OrganizationProjectHomePage from "@/app/components/admin/organization/project";
import { getAccess } from "@/app/lib/serverFunctions";

type Props = {
	params: Promise<{
		organization_id: string;
		project_id: string;
	}>;
};

export default async function Home({ params }: Props) {
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
	return <OrganizationProjectHomePage _organization={organization} _project={project} />;
}
