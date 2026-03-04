import { useMemo, useState } from "react";
import { Label } from "@repo/ui/components/label";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { Badge } from "@repo/ui/components/badge";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup, ButtonGroupText } from "@repo/ui/components/button-group";
import {
  IconUsers,
  IconChevronLeft,
  IconChevronRight,
  IconMinus,
  IconPlus,
  IconArrowRight,
  IconAdjustments,
} from "@tabler/icons-react";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import {
  assignOrganizationMemberSeatAction,
  unassignOrganizationMemberSeatAction,
  updateSubscriptionSeats,
  type SubscriptionDetails,
} from "@/lib/fetches/organization";

const PAGE_SIZE = 10;
const MAX_SEATS = 1000;

type SeatFilter = "all" | "assigned" | "unassigned";

interface BillingSeatManagementProps {
  subscription: SubscriptionDetails | null;
  onSeatsUpdated: () => void;
}

export function BillingSeatManagement({
  subscription,
  onSeatsUpdated,
}: BillingSeatManagementProps) {
  const { organization, setOrganization } = useLayoutOrganizationSettings();
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SeatFilter>("all");
  const [page, setPage] = useState(1);

  // Adjust seats dialog state
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustLoading, setAdjustLoading] = useState(false);

  const isPro = organization.plan === "pro";

  const members = organization.members ?? [];
  const subscriptionSeats = subscription?.seats ?? null;
  const totalSeats = subscriptionSeats ?? organization.seatCount ?? 0;
  const assignedCount = members.filter((m) => m.seatAssigned).length;

  // Stepper state: starts at current seat count when dialog opens
  const [newSeatCount, setNewSeatCount] = useState(totalSeats);

  // Per-seat price derived from subscription
  const perSeatPrice = useMemo(() => {
    if (!subscription || !subscription.seats || subscription.seats === 0)
      return null;
    return subscription.amount / subscription.seats;
  }, [subscription]);

  // Minimum seats = number of currently assigned members
  const minSeats = assignedCount;

  // Filter + search, then sort
  const filteredMembers = useMemo(() => {
    const query = search.toLowerCase().trim();

    return members
      .filter((m) => {
        // Status filter
        if (filter === "assigned" && !m.seatAssigned) return false;
        if (filter === "unassigned" && m.seatAssigned) return false;

        // Search across name, displayName, email
        if (query) {
          const name = (m.user.name ?? "").toLowerCase();
          const displayName = (m.user.displayName ?? "").toLowerCase();
          const email = (m.user.email ?? "").toLowerCase();
          if (
            !name.includes(query) &&
            !displayName.includes(query) &&
            !email.includes(query)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (a.seatAssigned !== b.seatAssigned) {
          return a.seatAssigned ? -1 : 1;
        }
        return (a.user.name ?? "").localeCompare(b.user.name ?? "");
      });
  }, [members, search, filter]);

  if (!isPro || !organization.polarSubscriptionId) {
    return null;
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedMembers = filteredMembers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Reset to page 1 when search/filter changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const handleFilterChange = (value: SeatFilter) => {
    setFilter(value);
    setPage(1);
  };

  const handleSeatToggle = async (
    userId: string,
    currentlyAssigned: boolean,
  ) => {
    setLoadingUserId(userId);
    try {
      if (currentlyAssigned) {
        const result = await unassignOrganizationMemberSeatAction(
          organization.id,
          userId,
        );
        if (result?.success) {
          setOrganization({
            ...organization,
            members: organization.members.map((m) =>
              m.userId === userId
                ? { ...m, seatAssigned: false, seatAssignedId: null }
                : m,
            ),
          });
        }
      } else {
        const result = await assignOrganizationMemberSeatAction(
          organization.id,
          userId,
        );
        if (result?.success) {
          setOrganization({
            ...organization,
            members: organization.members.map((m) =>
              m.userId === userId ? { ...m, seatAssigned: true } : m,
            ),
          });
        }
      }
    } finally {
      setLoadingUserId(null);
    }
  };

  // ─── Adjust Seats Dialog Handlers ────────────────────────────
  const handleAdjustOpen = (open: boolean) => {
    if (open) {
      setNewSeatCount(totalSeats);
    }
    setAdjustOpen(open);
  };

  const handleConfirmAdjust = async () => {
    if (newSeatCount === totalSeats) {
      setAdjustOpen(false);
      return;
    }

    setAdjustLoading(true);
    try {
      const result = await updateSubscriptionSeats(
        organization.id,
        newSeatCount,
      );
      if (result.success) {
        onSeatsUpdated();
        setAdjustOpen(false);
      }
    } finally {
      setAdjustLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const currency = subscription?.currency ?? "usd";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  const seatDiff = newSeatCount - totalSeats;
  const newTotal = perSeatPrice ? newSeatCount * perSeatPrice : null;
  const currentTotal = subscription?.amount ?? null;

  return (
    <div className="flex flex-col gap-3 bg-card p-3 rounded-lg">
      <div className="flex items-center justify-between">
        <Label variant="subheading">Seat Assignments</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {assignedCount} / {totalSeats} seats used
          </span>
          <AlertDialog open={adjustOpen} onOpenChange={handleAdjustOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="primary"
                size="sm"
                className="h-7 text-xs px-2 bg-secondary hover:bg-accent hover:border-primary"
              >
                Add or remove seats
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle asChild>
                  <Label variant={"heading"}>Adjust seat count</Label>
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <Label variant={"description"}>
                    Change the number of seats on your subscription. You cannot
                    go below the number of currently assigned seats (
                    {assignedCount}).
                  </Label>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="flex flex-col gap-4 py-2">
                {/* Stepper */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Seats</span>
                  <ButtonGroup>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={newSeatCount <= minSeats}
                      onClick={() =>
                        setNewSeatCount((c) => Math.max(minSeats, c - 1))
                      }
                    >
                      <IconMinus className="size-3.5" />
                    </Button>
                    <ButtonGroupText className="h-8 min-w-14 justify-center p-0">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={minSeats}
                        max={MAX_SEATS}
                        value={newSeatCount}
                        onChange={(e) => {
                          const parsed = Number.parseInt(e.target.value, 10);
                          if (!Number.isNaN(parsed)) {
                            setNewSeatCount(
                              Math.max(minSeats, Math.min(MAX_SEATS, parsed)),
                            );
                          }
                        }}
                        onBlur={() => {
                          if (newSeatCount < minSeats) {
                            setNewSeatCount(minSeats);
                          } else if (newSeatCount > MAX_SEATS) {
                            setNewSeatCount(MAX_SEATS);
                          }
                        }}
                        className="h-full w-full bg-transparent text-center text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </ButtonGroupText>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={newSeatCount >= MAX_SEATS}
                      onClick={() =>
                        setNewSeatCount((c) => Math.min(MAX_SEATS, c + 1))
                      }
                    >
                      <IconPlus className="size-3.5" />
                    </Button>
                  </ButtonGroup>
                </div>

                {/* Pricing info */}
                {perSeatPrice !== null && (
                  <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/50 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Per seat</span>
                      <span>
                        {formatCurrency(perSeatPrice)} /{" "}
                        {subscription?.recurringInterval ?? "month"}
                      </span>
                    </div>
                    {currentTotal !== null && newTotal !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">New total</span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-muted-foreground line-through">
                            {formatCurrency(currentTotal)}
                          </span>
                          <IconArrowRight className="size-3 text-muted-foreground" />
                          <span className="font-medium">
                            {formatCurrency(newTotal)}
                          </span>
                        </span>
                      </div>
                    )}
                    {seatDiff !== 0 && (
                      <div className="flex justify-between pt-1 border-t border-border">
                        <span className="text-muted-foreground">
                          {seatDiff > 0 ? "Adding" : "Removing"}{" "}
                          {Math.abs(seatDiff)} seat
                          {Math.abs(seatDiff) !== 1 ? "s" : ""}
                        </span>
                        <span
                          className={
                            seatDiff > 0 ? "text-foreground" : "text-success"
                          }
                        >
                          {seatDiff > 0 ? "+" : "-"}
                          {formatCurrency(
                            Math.abs(seatDiff * perSeatPrice),
                          )} / {subscription?.recurringInterval ?? "month"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={adjustLoading}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  variant="primary"
                  disabled={adjustLoading || newSeatCount === totalSeats}
                  onClick={handleConfirmAdjust}
                >
                  {adjustLoading ? "Updating..." : "Confirm"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Search + Filter toolbar */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-8 max-w-64 bg-accent focus-visible:bg-secondary"
          variant={"ghost"}
        />
        <Select
          value={filter}
          onValueChange={(v) => handleFilterChange(v as SeatFilter)}
        >
          <SelectTrigger
            size="sm"
            className="w-auto min-w-28 bg-accent! hover:bg-secondary! transition-all rounded-lg border-transparent"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg!">
            <SelectItem value="all">All members</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-accent! hover:bg-accent!">
              <TableHead className="w-5"></TableHead>
              <TableHead>Member</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedMembers.map((member) => {
              const isLoading = loadingUserId === member.userId;
              const allSeatsTaken = assignedCount >= totalSeats;
              const isDisabled =
                isLoading || (!member.seatAssigned && allSeatsTaken);

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Checkbox
                        checked={member.seatAssigned}
                        disabled={isDisabled}
                        onCheckedChange={() =>
                          handleSeatToggle(member.userId, member.seatAssigned)
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-3 w-3 rounded-full">
                        <AvatarImage
                          src={member.user.image || ""}
                          alt={member.user.name}
                          className="rounded-none"
                        />
                        <AvatarFallback className="rounded-full uppercase text-xs">
                          <IconUsers className="size-3" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-3 max-w-2/3">
                        <span className="text-sm font-medium shrink-0">
                          {member.user.displayName || member.user.name}
                        </span>
                        {member.user.email && (
                          <span className="text-xs text-muted-foreground truncate">
                            {member.user.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {member.seatAssigned ? (
                      <Badge variant="outline" className="text-xs text-success">
                        Assigned
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs text-muted-foreground"
                      >
                        No seat
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {pagedMembers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-sm text-muted-foreground py-6"
                >
                  {search || filter !== "all"
                    ? "No members match your search"
                    : "No members found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Showing {(safePage - 1) * PAGE_SIZE + 1}&ndash;
            {Math.min(safePage * PAGE_SIZE, filteredMembers.length)} of{" "}
            {filteredMembers.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            >
              <IconChevronLeft className="size-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              <IconChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
