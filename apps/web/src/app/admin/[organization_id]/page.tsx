import { redirect } from "next/navigation";
import OrganizationHomePage from "@/app/components/admin/organization";
import { getAccess, getOrganization } from "@/app/lib/serverFunctions";

type Props = {
	params: Promise<{
		organization_id: string;
	}>;
};

export default async function Home({ params }: Props) {
	const { organization_id } = await params;
	const { account } = await getAccess();
	const organization = await getOrganization(organization_id, account.id);
	if (!organization) {
		return redirect("/admin");
	}
	return <OrganizationHomePage organization={organization} />;
}
