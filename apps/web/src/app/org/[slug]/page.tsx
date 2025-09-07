interface OrgPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export default async function OrgPage({ params }: OrgPageProps) {
	const { slug } = await params;
	console.log("Organization slug:", slug);

	return (
		<div className="">
			<h1 className="text-4xl font-bold mb-8 text-center">Organization: {slug}</h1>
		</div>
	);
}
