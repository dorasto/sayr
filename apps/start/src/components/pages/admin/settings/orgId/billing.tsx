import { useMemo } from "react";
import { Separator } from "@repo/ui/components/separator";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { getPlanLimits } from "./billing/billing-data";
import type { UsageEntry } from "./billing/billing-usage";
import { BillingCurrentPlan } from "./billing/billing-current-plan";
import { BillingUsage } from "./billing/billing-usage";
import { BillingUpgradePrompt } from "./billing/billing-upgrade-prompt";
import { BillingPlanComparison } from "./billing/billing-plan-comparison";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useLayoutData } from "@/components/generic/Context";
import { Button } from "@repo/ui/components/button";
const API_URL =
  import.meta.env.VITE_APP_ENV === "development"
    ? "/backend-api/internal"
    : "/api/internal";
export default function SettingsOrganizationBillingPage() {
  const { ws, account } = useLayoutData();
  const { organization, setOrganization, views, issueTemplates, releases } =
    useLayoutOrganizationSettings();
  const memberCount = organization.members?.length ?? 0;

  const isAdmin = useMemo(() => {
    if (!account) return false;
    const currentMember = organization.members?.find(
      (m) => m.userId === account.id,
    );
    if (!currentMember?.teams) return false;
    return currentMember.teams.some(
      (mt) => mt.team.permissions.admin.administrator,
    );
  }, [account, organization.members]);

  const limits = getPlanLimits(organization.plan);

  const teamsCount = useMemo(() => {
    const teamIds = new Set<string>();
    for (const member of organization.members ?? []) {
      for (const t of member.teams ?? []) {
        teamIds.add(t.teamId);
      }
    }
    return teamIds.size;
  }, [organization.members]);

  const usage: Record<string, UsageEntry> = {
    members: { current: memberCount, limit: limits.members },
    savedViews: { current: views?.length ?? 0, limit: limits.savedViews },
    issueTemplates: {
      current: issueTemplates?.length ?? 0,
      limit: limits.issueTemplates,
    },
    teams: { current: teamsCount, limit: limits.teams },
    releases: { current: releases?.length ?? 0, limit: limits.releases },
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
      {isAdmin && (
        <a href={`${API_URL}/v1/polar/customer-portal?orgId=${organization.id}`}>
          <Button variant="outline">View Customer Portal</Button>
        </a>
      )}

      {organization.plan === "free" && <BillingUpgradePrompt />}
      <Separator />
      <BillingPlanComparison />
    </div>
  );
}
