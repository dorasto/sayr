import { getLabels, getOrganization } from "@repo/database";
import { redirect } from "next/navigation";
import type React from "react";
import { getAccess } from "@/app/lib/serverFunctions";
import { RootProviderOrganization } from "./Context";

export default async function RootLayout({
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
	return (
		<RootProviderOrganization organization={organization} labels={labels}>
			{children}
		</RootProviderOrganization>
	);
}
