import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import {
  ensureCdnUrl,
  formatDateTime,
  formatDateTimeFromNow,
} from "@repo/util";
import {
  IconCalendar,
  IconClock,
  IconCreditCard,
  IconSettings,
  IconShield,
  IconUsers,
  IconBan,
  IconCheck,
  IconX,
  IconSparkles,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ConsoleOrgDetail, ConsoleOrgMember } from "@/lib/fetches/console";
import type { OrganizationSettings } from "@repo/database";
import OrgAiUsage from "./org-ai-usage";

const isCloud = import.meta.env.VITE_SAYR_EDITION === "cloud";

type OrgDetailProps = {
  data: ConsoleOrgDetail;
};

export default function OrgDetail({ data }: OrgDetailProps) {
  const { org, members } = data;

  return (
    <div className="space-y-6">
      <OrgHeader org={org} />

      <Tabs defaultValue="members" className="w-full flex flex-col shrink-0">
        <TabsList className="max-w-dvw justify-start sticky top-0 z-50 overflow-x-auto">
          <TabsTrigger value="members" className="gap-1.5 shrink-0">
            <IconUsers className="size-3.5" />
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <IconSettings className="size-3.5" />
            Settings
          </TabsTrigger>
          {isCloud && (
            <TabsTrigger value="billing" className="gap-1.5">
              <IconCreditCard className="size-3.5" />
              Billing
            </TabsTrigger>
          )}
          {isCloud && (
            <TabsTrigger value="ai-usage" className="gap-1.5">
              <IconSparkles className="size-3.5" />
              AI Usage
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <MembersSection members={members} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SettingsSection
            settings={org.settings as OrganizationSettings | null}
          />
        </TabsContent>

        {isCloud && (
          <TabsContent value="billing" className="mt-4">
            <BillingSection org={org} />
          </TabsContent>
        )}
        {isCloud && (
          <TabsContent value="ai-usage" className="mt-4">
            <OrgAiUsage orgId={org.id} settings={org.settings as OrganizationSettings | null} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ──────────────────────────────────────────────
// Header
// ──────────────────────────────────────────────

function OrgHeader({ org }: { org: ConsoleOrgDetail["org"] }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="size-16 rounded-lg">
            {org.logo ? (
              <AvatarImage src={ensureCdnUrl(org.logo)} alt={org.name} />
            ) : null}
            <AvatarFallback className="rounded-lg text-lg uppercase">
              {org.name?.slice(0, 2) || "??"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{org.name}</h2>
              {org.isSystemOrg && (
                <Badge variant="secondary">
                  <IconSettings className="size-3 mr-1" />
                  System Org
                </Badge>
              )}
              {isCloud && (
                <Badge
                  variant={org.plan === "pro" ? "default" : "outline"}
                  className="capitalize"
                >
                  {org.plan || "free"}
                </Badge>
              )}
            </div>

            <div className="text-sm text-muted-foreground">/{org.slug}</div>

            {org.description && (
              <div className="text-sm text-muted-foreground">
                {org.description}
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
              <span className="font-mono">{org.shortId}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1">
                      <IconCalendar className="size-3" />
                      Created {formatDateTimeFromNow(org.createdAt)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatDateTime(org.createdAt)}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1">
                      <IconClock className="size-3" />
                      Updated {formatDateTimeFromNow(org.updatedAt)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatDateTime(org.updatedAt)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Members
// ──────────────────────────────────────────────

function MembersSection({ members }: { members: ConsoleOrgMember[] }) {
  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-4">
            This organization has no members.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <IconUsers className="size-3.5" />
          Members
        </CardTitle>
        <CardDescription className="text-xs">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead className="w-[160px]">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Link
                      to="/console/users/$userId"
                      params={{ userId: member.userId }}
                      className="flex items-center gap-3 hover:underline"
                    >
                      <Avatar className="size-8 rounded-lg">
                        {member.user.image ? (
                          <AvatarImage
                            src={member.user.image}
                            alt={member.user.name}
                          />
                        ) : null}
                        <AvatarFallback className="rounded-lg text-xs uppercase">
                          {member.user.name?.slice(0, 2) || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm">
                            {member.user.displayName || member.user.name}
                          </span>
                          {member.user.banned && (
                            <Badge variant="destructive" className="text-xs">
                              <IconBan className="size-3 mr-0.5" />
                              Banned
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {member.user.email}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {member.seatAssigned ? (
                      <Badge variant="secondary" className="text-xs">
                        Seat
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.teams.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {member.teams.map((team) => (
                          <Badge
                            key={team.id}
                            variant={team.isAdmin ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {team.isAdmin && (
                              <IconShield className="size-3 mr-1" />
                            )}
                            {team.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No teams
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {member.joinedAt ? formatDateTime(member.joinedAt) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Settings
// ──────────────────────────────────────────────

function SettingRow({
  label,
  value,
}: {
  label: string;
  value: boolean | string | null | undefined;
}) {
  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between py-2.5 border-b last:border-b-0">
        <span className="text-sm">{label}</span>
        {value ? (
          <Badge variant="secondary" className="text-xs gap-1">
            <IconCheck className="size-3" />
            Enabled
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs gap-1">
            <IconX className="size-3" />
            Disabled
          </Badge>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-b-0">
      <span className="text-sm">{label}</span>
      <span className="text-sm text-muted-foreground">{value ?? "—"}</span>
    </div>
  );
}

function SettingsSection({
  settings,
}: {
  settings: OrganizationSettings | null;
}) {
  if (!settings) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-4">
            No settings found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <IconSettings className="size-3.5" />
            Organization Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow
            label="Allow Actions on Closed Tasks"
            value={settings.allowActionsOnClosedTasks}
          />
          <SettingRow label="Public Actions" value={settings.publicActions} />
          <SettingRow
            label="Enable Public Page"
            value={settings.enablePublicPage}
          />
          <SettingRow
            label="Public Task Allow Blank"
            value={settings.publicTaskAllowBlank}
          />
        </CardContent>
      </Card>

      {settings.publicTaskFields && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Public Task Fields</CardTitle>
            <CardDescription className="text-xs">
              Fields public users can set when creating a task
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingRow
              label="Labels"
              value={settings.publicTaskFields.labels}
            />
            <SettingRow
              label="Category"
              value={settings.publicTaskFields.category}
            />
            <SettingRow
              label="Priority"
              value={settings.publicTaskFields.priority}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Billing (cloud-only)
// ──────────────────────────────────────────────

function BillingSection({ org }: { org: ConsoleOrgDetail["org"] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <IconCreditCard className="size-3.5" />
          Billing Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SettingRow label="Plan" value={org.plan || "free"} />
        <SettingRow
          label="Seat Count"
          value={org.seatCount != null ? String(org.seatCount) : null}
        />
        <SettingRow label="Polar Customer ID" value={org.polarCustomerId} />
        <SettingRow
          label="Polar Subscription ID"
          value={org.polarSubscriptionId}
        />
        <SettingRow
          label="Current Period End"
          value={
            org.currentPeriodEnd ? formatDateTime(org.currentPeriodEnd) : null
          }
        />
      </CardContent>
    </Card>
  );
}
