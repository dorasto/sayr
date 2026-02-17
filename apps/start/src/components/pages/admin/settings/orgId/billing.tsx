"use client";

import { Separator } from "@repo/ui/components/separator";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { CURRENT_PLAN, INVOICES, USAGE } from "./billing/billing-data";
import { BillingCurrentPlan } from "./billing/billing-current-plan";
import { BillingUsage } from "./billing/billing-usage";
import { BillingUpgradePrompt } from "./billing/billing-upgrade-prompt";
import { BillingPlanComparison } from "./billing/billing-plan-comparison";

export default function SettingsOrganizationBillingPage() {
  const { organization } = useLayoutOrganizationSettings();
  const memberCount = organization.members?.length ?? 0;
  const usage = {
    ...USAGE,
    members: { ...USAGE.members, current: memberCount },
  };

  return (
    <div className="flex flex-col gap-9">
      <BillingCurrentPlan memberCount={memberCount} />
      <BillingUsage usage={usage} />
      {CURRENT_PLAN.id === "free" && <BillingUpgradePrompt />}
      <Separator />
      <BillingPlanComparison />
    </div>
  );
}
