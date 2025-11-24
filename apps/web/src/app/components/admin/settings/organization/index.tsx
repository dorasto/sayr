"use client";

import { Label } from "@repo/ui/components/label";
import { useLayoutData } from "@/app/admin/Context";
import { useLayoutOrganizationSettings } from "@/app/admin/settings/org/[org_id]/Context";
import { SubWrapper } from "@/app/components/layout/wrapper";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";

export default function SettingsOrganizationPage() {
	const { ws } = useLayoutData();
	const { organization } = useLayoutOrganizationSettings();
	useWebSocketSubscription({
		ws,
	});
	return (
		<SubWrapper title="Settings" style="compact">
			<div className="flex flex-col gap-3">
				<Label variant={"heading"}>Org Id: {organization.id}</Label>
				<Label variant={"heading"}>Org Name: {organization.name}</Label>
			</div>
		</SubWrapper>
	);
}
