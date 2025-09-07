import { getOrganization } from "@/app/lib/serverFunctions";

interface OrgPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export default async function OrgPage({ params }: OrgPageProps) {
	const { slug } = await params;
	console.log("Organization slug:", slug);
	const organization = await getOrganization(slug);
	if (!organization) {
		return "NOT FOUND";
	}
	return (
		<div className="">
			<h1 className="text-4xl font-bold mb-8 text-center">Organization: {slug}</h1>
			<h1>org detail {organization.name}</h1>
			{/** biome-ignore lint/performance/noImgElement: <will use> */}
			<img src={organization.logo || ""} alt={organization.name} />
			{/** biome-ignore lint/performance/noImgElement: <will use> */}
			<img src={organization.bannerImg || ""} alt={organization.name} />
		</div>
	);
}
