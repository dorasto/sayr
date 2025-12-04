import { db, getLabels, getOrganization, schema } from "@repo/database";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type React from "react";
import { getAccess } from "@/app/lib/serverFunctions";
import { RootProviderOrganization } from "./Context";

export default async function RootLayoutOrganization({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{
		organization_id: string;
	}>;
}>) {
	const { organization_id } = await params;
	const { account } = await getAccess();
	const organization = await getOrganization(organization_id, account.id);
	if (!organization) {
		return redirect("/admin");
	}
	const labels = await getLabels(organization.id);
	const views = await db.select().from(schema.savedView).where(eq(schema.savedView.organizationId, organization.id));
	const categories = await db.query.category.findMany({
		where: (category) => eq(category.organizationId, organization.id),
	});
	return (
		<RootProviderOrganization organization={organization} labels={labels} views={views} categories={categories}>
			{children}
		</RootProviderOrganization>
	);
}
