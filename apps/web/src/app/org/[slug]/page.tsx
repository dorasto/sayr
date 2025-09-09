import Image from "next/image";
import { getOrganizationPublic } from "@/app/lib/serverFunctions";

interface OrgPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export default async function OrgPage({ params }: OrgPageProps) {
	const { slug } = await params;
	console.log("Organization slug:", slug);
	const organization = await getOrganizationPublic(slug);
	if (!organization) {
		return "NOT FOUND";
	}
	return (
		<div className="">
			<div className="aspect-video w-full">
				<Image width={1920} height={1080} src={organization.bannerImg || ""} alt={organization.name} />
			</div>
			{/** biome-ignore lint/performance/noImgElement: <will use> */}
			<img src={organization.logo || ""} alt={organization.name} />
		</div>
	);
}
