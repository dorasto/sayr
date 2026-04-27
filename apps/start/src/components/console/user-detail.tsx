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
  IconBuilding,
  IconCalendar,
  IconDeviceDesktop,
  IconKey,
  IconBrandGithub,
  IconShield,
  IconShieldCheck,
  IconTimeline,
  IconUsers,
  IconUserShield,
  IconBan,
  IconMail,
  IconClock,
  IconActivity,
} from "@tabler/icons-react";
import type {
  ConsoleUserDetail,
  ConsoleRecentActivity,
  ConsoleUserOrganization,
  ConsoleUserSession,
  ConsoleUserAccount,
} from "@/lib/fetches/console";
import { Link } from "@tanstack/react-router";

// "Safe" event types where fromValue/toValue can be shown
const SAFE_VALUE_EVENT_TYPES = new Set([
  "status_change",
  "priority_change",
  "category_change",
  "release_change",
]);

// Human-readable event type labels
const EVENT_TYPE_LABELS: Record<string, string> = {
  status_change: "Status Change",
  priority_change: "Priority Change",
  comment: "Comment",
  label_added: "Label Added",
  label_removed: "Label Removed",
  assignee_added: "Assignee Added",
  assignee_removed: "Assignee Removed",
  created: "Created",
  updated: "Updated",
  category_change: "Category Change",
  release_change: "Release Change",
  github_commit_ref: "GitHub Commit Ref",
  github_pr_linked: "GitHub PR Linked",
  github_pr_commit: "GitHub PR Commit",
  github_pr_merged: "GitHub PR Merged",
};

// Provider display info
const PROVIDER_INFO: Record<string, { label: string; icon: typeof IconKey }> = {
  github: { label: "GitHub", icon: IconBrandGithub },
  credential: { label: "Email / Password", icon: IconMail },
};

type UserDetailProps = {
  data: ConsoleUserDetail;
};

export default function UserDetail({ data }: UserDetailProps) {
  const { user, organizations, sessions, accounts, activity } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <UserHeader user={user} />

      {/* Tabbed sections */}
      <Tabs defaultValue="organizations" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="organizations" className="gap-1.5">
            <IconBuilding className="size-3.5" />
            Organizations ({organizations.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5">
            <IconTimeline className="size-3.5" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5">
            <IconDeviceDesktop className="size-3.5" />
            Sessions ({sessions.length})
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-1.5">
            <IconKey className="size-3.5" />
            Connections ({accounts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="mt-4">
          <OrganizationsSection organizations={organizations} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivitySection activity={activity} />
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <SessionsSection sessions={sessions} />
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          <AccountsSection accounts={accounts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ──────────────────────────────────────────────
// Header
// ──────────────────────────────────────────────

function UserHeader({ user }: { user: ConsoleUserDetail["user"] }) {
  const isBanned = user.banned === true;
  const isVerified = user.emailVerified === true;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="size-16 rounded-lg">
            {user.image ? (
              <AvatarImage src={ensureCdnUrl(user.image)} alt={user.name} />
            ) : null}
            <AvatarFallback className="rounded-lg text-lg uppercase">
              {user.name?.slice(0, 2) || "??"}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">
                {user.displayName || user.name}
              </h2>
              {user.displayName && user.displayName !== user.name && (
                <span className="text-sm text-muted-foreground">
                  ({user.name})
                </span>
              )}
              {/* Role badge */}
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                {user.role === "admin" ? (
                  <IconShieldCheck className="size-3 mr-1" />
                ) : (
                  <IconUsers className="size-3 mr-1" />
                )}
                {user.role || "user"}
              </Badge>
              {/* Status badges */}
              {isBanned && (
                <Badge variant="destructive">
                  <IconBan className="size-3 mr-1" />
                  Banned
                </Badge>
              )}
              {!isBanned && isVerified && (
                <Badge variant="secondary">Active</Badge>
              )}
              {!isBanned && !isVerified && (
                <Badge variant="outline">Pending Verification</Badge>
              )}
            </div>

            <div className="text-sm text-muted-foreground">{user.email}</div>

            {/* Ban info */}
            {isBanned && user.banReason && (
              <div className="text-sm text-destructive">
                Reason: {user.banReason}
                {user.banExpires && (
                  <span className="ml-2">
                    (expires {formatDateTime(user.banExpires)})
                  </span>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1">
                      <IconCalendar className="size-3" />
                      Joined {formatDateTimeFromNow(user.createdAt)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatDateTime(user.createdAt)}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1">
                      <IconClock className="size-3" />
                      Updated {formatDateTimeFromNow(user.updatedAt)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatDateTime(user.updatedAt)}
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
// Organizations & Roles
// ──────────────────────────────────────────────

function OrganizationsSection({
  organizations,
}: {
  organizations: ConsoleUserOrganization[];
}) {
  if (organizations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-4">
            This user is not a member of any organizations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {organizations.map((org) => (
        <Link to={`/console/organizations/$orgId`} params={{ orgId: org.id }}>
          <Card key={org.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-9 rounded-lg">
                  {org.logo ? (
                    <AvatarImage src={ensureCdnUrl(org.logo)} alt={org.name} />
                  ) : null}
                  <AvatarFallback className="rounded-lg text-xs uppercase">
                    {org.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm">{org.name}</CardTitle>
                  <CardDescription className="text-xs">
                    /{org.slug}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Join date */}
              {org.joinedAt && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <IconCalendar className="size-3" />
                  Joined {formatDateTime(org.joinedAt)}
                </div>
              )}

              {/* Teams */}
              {org.teams.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Teams
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {org.teams.map((team) => (
                      <Badge
                        key={team.id}
                        variant={team.isAdmin ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {team.isAdmin && <IconShield className="size-3 mr-1" />}
                        {team.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No team assignments
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Activity
// ──────────────────────────────────────────────

function ActivitySection({
  activity,
}: {
  activity: ConsoleUserDetail["activity"];
}) {
  const { aggregates, recent } = activity;
  const totalEvents = aggregates.reduce((sum, a) => sum + a.count, 0);

  return (
    <div className="space-y-4">
      {/* Aggregate cards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <IconActivity className="size-3.5" />
            Activity Summary
          </CardTitle>
          <CardDescription className="text-xs">
            {totalEvents} total event{totalEvents !== 1 ? "s" : ""} across all
            organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aggregates.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {aggregates
                .sort((a, b) => b.count - a.count)
                .map((agg) => (
                  <div
                    key={agg.eventType}
                    className="flex flex-col gap-1 rounded-md border p-3"
                  >
                    <span className="text-xs text-muted-foreground">
                      {EVENT_TYPE_LABELS[agg.eventType] || agg.eventType}
                    </span>
                    <span className="text-lg font-semibold">{agg.count}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activity recorded.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <IconTimeline className="size-3.5" />
            Recent Events
          </CardTitle>
          <CardDescription className="text-xs">
            Last {recent.length} event{recent.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length > 0 ? (
            <div className="space-y-0">
              {recent.map((event) => (
                <RecentEventRow key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent events.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RecentEventRow({ event }: { event: ConsoleRecentActivity }) {
  const showValues = SAFE_VALUE_EVENT_TYPES.has(event.eventType);
  const fromVal =
    showValues && event.fromValue != null ? String(event.fromValue) : null;
  const toVal =
    showValues && event.toValue != null ? String(event.toValue) : null;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-b-0">
      {/* Event type */}
      <Badge variant="secondary" className="text-xs shrink-0">
        {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
      </Badge>

      {/* Value change (safe types only) */}
      {fromVal && toVal && (
        <span className="text-xs text-muted-foreground truncate">
          {fromVal} &rarr; {toVal}
        </span>
      )}

      {/* Org name */}
      {event.organization && (
        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 ml-auto">
          <IconBuilding className="size-3" />
          {event.organization.name}
        </span>
      )}

      {/* Timestamp */}
      {event.createdAt && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDateTimeFromNow(event.createdAt)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{formatDateTime(event.createdAt)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Sessions
// ──────────────────────────────────────────────

function SessionsSection({ sessions }: { sessions: ConsoleUserSession[] }) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-4">
            No sessions found.
          </p>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <IconDeviceDesktop className="size-3.5" />
          Sessions
        </CardTitle>
        <CardDescription className="text-xs">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead>Login Time</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>User Agent</TableHead>
                <TableHead className="w-[120px]">Impersonated By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => {
                const isExpired = new Date(session.expiresAt) < now;
                return (
                  <TableRow key={session.id}>
                    <TableCell>
                      <Badge
                        variant={isExpired ? "outline" : "secondary"}
                        className="text-xs"
                      >
                        {isExpired ? "Expired" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              {formatDateTimeFromNow(session.createdAt)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {formatDateTime(session.createdAt)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(session.expiresAt)}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {session.ipAddress || "-"}
                    </TableCell>
                    <TableCell
                      className="text-xs text-muted-foreground max-w-[300px] truncate"
                      title={session.userAgent || undefined}
                    >
                      {session.userAgent || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {session.impersonatedBy ? (
                        <Badge variant="outline" className="text-xs">
                          <IconUserShield className="size-3 mr-1" />
                          Impersonated
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Connected Accounts
// ──────────────────────────────────────────────

function AccountsSection({ accounts }: { accounts: ConsoleUserAccount[] }) {
  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-4">
            No connected accounts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <IconKey className="size-3.5" />
          Connected Accounts
        </CardTitle>
        <CardDescription className="text-xs">
          {accounts.length} connected provider{accounts.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {accounts.map((account) => {
            const provider = PROVIDER_INFO[account.providerId];
            const ProviderIcon = provider?.icon || IconKey;
            const providerLabel = provider?.label || account.providerId;

            return (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                    <ProviderIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{providerLabel}</div>
                    {account.scope && (
                      <div className="text-xs text-muted-foreground">
                        Scopes: {account.scope}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Connected {formatDateTime(account.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
