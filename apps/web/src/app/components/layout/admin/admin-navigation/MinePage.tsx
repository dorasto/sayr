"use client";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";

export default function MinePage() {
	const { value: organization } = useStateManagement<schema.OrganizationWithMembers>("organization", null, 1);
	const { value: labels } = useStateManagement<schema.labelType[]>("labels", [], 1);
	if (!organization || !labels) {
		return;
	}
	return <div>My Tasks</div>;
}
