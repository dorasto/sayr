"use client";

import { Separator } from "@repo/ui/components/separator";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { USAGE } from "./billing/billing-data";
import { BillingCurrentPlan } from "./billing/billing-current-plan";
import { BillingUsage } from "./billing/billing-usage";
import { BillingUpgradePrompt } from "./billing/billing-upgrade-prompt";
import { BillingPlanComparison } from "./billing/billing-plan-comparison";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useLayoutData } from "@/components/generic/Context";
import { Button } from "@repo/ui/components/button";
const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal"
export default function SettingsOrganizationBillingPage() {
  const { ws } = useLayoutData();
  const { organization, setOrganization } = useLayoutOrganizationSettings();
  const memberCount = organization.members?.length ?? 0;
  const usage = {
    ...USAGE,
    members: { ...USAGE.members, current: memberCount },
  };
  useWebSocketSubscription({
    ws,
    orgId: organization.id,
    organization: organization,
    channel: "admin",
    setOrganization: setOrganization,
  });
  return (
    <div className="flex flex-col gap-9">
      <BillingCurrentPlan memberCount={memberCount} />
      <BillingUsage usage={usage} />
      <a href={`${API_URL}/v1/polar/customer-portal?orgId=${organization.id}`}>
        <Button variant="outline">View Customer Portal</Button>
      </a>
      {organization.plan === "free" && <BillingUpgradePrompt />}
      <Separator />
      <BillingPlanComparison />
    </div>
  );
}
