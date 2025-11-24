import { db, getLabels, getOrganization } from "@repo/database";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type React from "react";
import { getAccess } from "@/app/lib/serverFunctions";
import { SettingsProviderOrganization } from "./Context";

export default async function SettingsLayoutOrganization({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{
		org_id: string;
	}>;
}>) {
	const { org_id } = await params;
	const { account } = await getAccess();
	const organization = await getOrganization(org_id, account.id);
	if (!organization) {
		return redirect("/admin/settings");
	}
	const labels = await getLabels(organization.id);
	const views = await db.query.savedView.findMany({
		where: (view) => eq(view.organizationId, organization.id),
	});
	const categories = await db.query.category.findMany({
		where: (category) => eq(category.organizationId, organization.id),
	});
	return (
		<SettingsProviderOrganization organization={organization} labels={labels} views={views} categories={categories}>
			{children}
		</SettingsProviderOrganization>
	);
}
