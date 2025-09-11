import { getOrganizationPublic } from "@repo/database";
import PublicOrgHomePage from "@/app/components/org";

interface OrgPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export default async function OrgPage({ params }: OrgPageProps) {
	const { slug } = await params;
	const organization = await getOrganizationPublic(slug);
	if (!organization) {
		return "NOT FOUND";
	}
	return <PublicOrgHomePage _organization={organization} />;
}
