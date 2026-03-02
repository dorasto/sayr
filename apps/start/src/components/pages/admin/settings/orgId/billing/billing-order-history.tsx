import { useEffect, useState, useCallback } from "react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import {
  IconFileInvoice,
  IconDownload,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import {
  getOrderHistory,
  getOrderInvoice,
  type OrderEntry,
} from "@/lib/fetches/organization";
import { cn } from "@/lib/utils";

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

function getOrderStatusVariant(
  status: string,
): "default" | "outline" | "secondary" | "destructive" {
  switch (status) {
    case "paid":
      return "outline";
    case "pending":
      return "secondary";
    case "refunded":
    case "partially_refunded":
      return "destructive";
    default:
      return "outline";
  }
}

function getOrderStatusLabel(status: string): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "pending":
      return "Pending";
    case "refunded":
      return "Refunded";
    case "partially_refunded":
      return "Partially Refunded";
    case "void":
      return "Void";
    default:
      return status;
  }
}

function getBillingReasonLabel(reason: string): string {
  switch (reason) {
    case "purchase":
      return "Purchase";
    case "subscription_create":
      return "Subscription Created";
    case "subscription_cycle":
      return "Renewal";
    case "subscription_update":
      return "Subscription Update";
    default:
      return reason;
  }
}

export function BillingOrderHistory() {
  const { organization } = useLayoutOrganizationSettings();
  const [orders, setOrders] = useState<OrderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [maxPage, setMaxPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const pageSize = 10;

  const fetchOrders = useCallback(
    (pageNum: number) => {
      if (!organization.polarCustomerId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      getOrderHistory(organization.id, pageNum, pageSize).then((res) => {
        if (res.success && res.data) {
          setOrders(res.data.items);
          setTotalCount(res.data.pagination.totalCount);
          setMaxPage(res.data.pagination.maxPage);
        } else {
          setError(res.error ?? "Failed to load orders");
        }
        setLoading(false);
      });
    },
    [organization.id, organization.polarCustomerId],
  );

  useEffect(() => {
    fetchOrders(page);
  }, [page, fetchOrders]);

  const handleDownloadInvoice = async (orderId: string) => {
    setDownloadingId(orderId);
    try {
      const res = await getOrderInvoice(organization.id, orderId);
      if (res.success && res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  // No Polar customer — nothing to show
  if (!organization.polarCustomerId) {
    return null;
  }

  if (loading && orders.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <Label variant="subheading">Invoice History</Label>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <Label variant="subheading">Invoice History</Label>
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          {error}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <Label variant="subheading">Invoice History</Label>
        <div className="rounded-lg border p-4 flex items-center gap-3 text-sm text-muted-foreground">
          <IconFileInvoice className="size-4" />
          No invoices yet
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label variant="subheading">Invoice History</Label>
        <span className="text-xs text-muted-foreground">
          {totalCount} invoice{totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Invoice</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
              <TableHead className="text-xs w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-36">
                  {order.invoiceNumber || "\u2014"}
                </TableCell>
                <TableCell className="text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-foreground">
                      {getBillingReasonLabel(order.billingReason)}
                    </span>
                    {order.product && (
                      <span className="text-muted-foreground">
                        {order.seats != null ? ` (${order.seats} seats)` : ""}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={getOrderStatusVariant(order.status)}
                    className={cn(
                      "text-xs",
                      order.status === "paid" && "text-green-500",
                    )}
                  >
                    {getOrderStatusLabel(order.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-right font-medium whitespace-nowrap">
                  {formatCurrency(order.totalAmount, order.currency)}
                </TableCell>
                <TableCell>
                  {order.isInvoiceGenerated && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDownloadInvoice(order.id)}
                      disabled={downloadingId === order.id}
                      title="Download invoice"
                    >
                      <IconDownload
                        className={cn(
                          "size-3.5",
                          downloadingId === order.id && "animate-pulse",
                        )}
                      />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {maxPage > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {page} of {maxPage}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              <IconChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              disabled={page >= maxPage || loading}
            >
              <IconChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
