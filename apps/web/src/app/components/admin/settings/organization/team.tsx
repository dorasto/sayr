"use client";

import { useLayoutData } from "@/app/admin/Context";
import { useLayoutOrganizationSettings } from "@/app/admin/settings/org/[org_id]/Context";
import { SubWrapper } from "@/app/components/layout/wrapper";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";

export default function SettingsOrganizationPageTeam() {
	const { ws } = useLayoutData();
	const { organization } = useLayoutOrganizationSettings();
	useWebSocketSubscription({
		ws,
	});
	return (
		<SubWrapper title="Team" style="compact">
			<div className="flex flex-col gap-3">{JSON.stringify(organization.members, null, 4)}</div>
		</SubWrapper>
	);
}
