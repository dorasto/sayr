import { useCallback, useEffect, useMemo, useState } from "react";
import { Separator } from "@repo/ui/components/separator";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import type { PlanLimits } from "@repo/edition";
import type { UsageEntry } from "./billing/billing-usage";
import { BillingCurrentPlan } from "./billing/billing-current-plan";
import { BillingUsage } from "./billing/billing-usage";
import { BillingUpgradePrompt } from "./billing/billing-upgrade-prompt";
import { BillingPlanComparison } from "./billing/billing-plan-comparison";
import { BillingSubscriptionDetails } from "./billing/billing-subscription-details";
import { BillingOrderHistory } from "./billing/billing-order-history";
import { BillingSeatManagement } from "./billing/billing-seat-management";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import { useLayoutData } from "@/components/generic/Context";
import { Button } from "@repo/ui/components/button";
import {
  getSubscriptionDetails,
  type SubscriptionDetails,
} from "@/lib/fetches/organization";

const API_URL =
  import.meta.env.VITE_APP_ENV === "development"
    ? "/backend-api/internal"
    : "/api/internal";
export default function SettingsOrganizationBillingPage({ limits }: { limits: PlanLimits }) {
  const { serverEvents, account } = useLayoutData();
  const { organization, setOrganization, views, issueTemplates, releases } =
    useLayoutOrganizationSettings();
  const memberCount =
    organization.members.filter((m) => m.seatAssigned).length ?? 0;
  const totalMemberCount = organization.members?.length ?? 0;
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(
    null,
  );

  const refreshSubscription = useCallback(() => {
    if (organization.plan === "free" || !organization.polarSubscriptionId)
      return;
    getSubscriptionDetails(organization.id).then((res) => {
      if (res.success && res.data) {
        setSubscription(res.data);
      }
    });
  }, [organization.id, organization.plan, organization.polarSubscriptionId]);

  useEffect(() => {
    if (organization.plan === "free" || !organization.polarSubscriptionId)
      return;
    let cancelled = false;
    getSubscriptionDetails(organization.id).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setSubscription(res.data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [organization.id, organization.plan, organization.polarSubscriptionId]);

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

  const teamsCount = useMemo(() => {
    const teamIds = new Set<string>();
    for (const member of organization.members ?? []) {
      for (const t of member.teams ?? []) {
        teamIds.add(t.teamId);
      }
    }
    return teamIds.size;
  }, [organization.members]);

  const memberLimit =
    organization.plan === "pro"
      ? (subscription?.seats ?? organization.seatCount ?? limits.members)
      : limits.members;

  const usage: Record<string, UsageEntry> = {
    members: { current: memberCount, limit: memberLimit },
    savedViews: { current: views?.length ?? 0, limit: limits.savedViews },
    issueTemplates: {
      current: issueTemplates?.length ?? 0,
      limit: limits.issueTemplates,
    },
    teams: { current: teamsCount, limit: limits.teams },
    releases: { current: releases?.length ?? 0, limit: limits.releases },
  };

  useServerEventsSubscription({
    serverEvents,
    orgId: organization.id,
    organization: organization,
    channel: "admin",
    setOrganization: setOrganization,
  });

  return (
    <div className="flex flex-col gap-9">
      <BillingCurrentPlan
        totalMembers={totalMemberCount}
        subscription={subscription}
      />
      {organization.plan === "free" && <BillingUpgradePrompt />}
      {isAdmin && (
        <BillingSubscriptionDetails
          subscription={subscription}
          onSubscriptionRevoked={() => window.location.reload()}
        />
      )}
      {isAdmin && (
        <BillingSeatManagement
          subscription={subscription}
          onSeatsUpdated={refreshSubscription}
        />
      )}
      <BillingUsage usage={usage} />
      {isAdmin && <BillingOrderHistory />}

      <Separator />
      <BillingPlanComparison />
    </div>
  );
}
