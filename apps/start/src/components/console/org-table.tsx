import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@repo/ui/components/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { cn } from "@repo/ui/lib/utils";
import { IconBuilding, IconSettings } from "@tabler/icons-react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleXIcon,
  Columns3Icon,
  EllipsisIcon,
  FilterIcon,
  ListFilterIcon,
  LoaderIcon,
  UsersIcon,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  getConsoleOrgs,
  getConsoleOrgsAiSummary,
  getConsoleOrgsMrrSummary,
  type ConsoleOrg,
  type ConsoleOrgAiSummary,
  type ConsoleOrgMrrSummary,
  type ConsolePaginationMeta,
  type ConsoleOrgsParams,
} from "@/lib/fetches/console";
import { Link } from "@tanstack/react-router";

type OrgTableProps = {
  initialData: {
    orgs: ConsoleOrg[];
    pagination: ConsolePaginationMeta;
  };
};

// ──────────────────────────────────────────────
// EUR pricing helpers
// ──────────────────────────────────────────────

const MISTRAL_EUR_PRICING: Record<
  string,
  { inputEurPerToken: number; outputEurPerToken: number }
> = {
  "mistral-small-latest": {
    inputEurPerToken: 0.1 / 1_000_000,
    outputEurPerToken: 0.3 / 1_000_000,
  },
  "mistral-medium-latest": {
    inputEurPerToken: 0.4 / 1_000_000,
    outputEurPerToken: 2.0 / 1_000_000,
  },
  "mistral-large-latest": {
    inputEurPerToken: 2.0 / 1_000_000,
    outputEurPerToken: 6.0 / 1_000_000,
  },
};

function computeOrgEurCost(summary: ConsoleOrgAiSummary): number {
  // Use the persisted cost_cents from ClickHouse (stored at event-emit time in EUR cents)
  // so the figure is accurate regardless of model mix.
  return Number(summary.total_cost_cents) / 100;
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ──────────────────────────────────────────────
// AI column IDs — sorted client-side, not server-side
// ──────────────────────────────────────────────

const AI_SORT_COLS = new Set(["aiRequests", "aiTokens", "aiCost", "mrr"]);

// ──────────────────────────────────────────────
// Column factory — closes over aiSummaryMap for AI cells
// ──────────────────────────────────────────────

function buildColumns(
  aiSummaryMap: Map<string, ConsoleOrgAiSummary>,
  mrrSummaryMap: Map<string, ConsoleOrgMrrSummary>,
): ColumnDef<ConsoleOrg>[] {
  return [
    {
      header: "Organization",
      accessorKey: "name",
      cell: ({ row }) => (
        <Link
          to="/console/organizations/$orgId"
          params={{ orgId: row.original.id }}
          className="flex items-center gap-3 hover:underline"
        >
          {row.original.logo ? (
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={row.original.logo} alt={row.original.name} />
              <AvatarFallback className="rounded-lg uppercase">
                {row.original.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <IconBuilding size={14} className="text-muted-foreground" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{row.original.name}</span>
              {row.original.isSystemOrg && (
                <span title="System Organization" className="text-blue-500">
                  <IconSettings size={13} />
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              /{row.original.slug}
            </div>
          </div>
        </Link>
      ),
      size: 280,
      enableHiding: false,
    },
    {
      header: "Plan",
      accessorKey: "plan",
      cell: ({ row }) => (
        <Badge
          variant={row.original.plan === "pro" ? "default" : "outline"}
          className="capitalize"
        >
          {row.original.plan || "free"}
        </Badge>
      ),
      size: 100,
      enableHiding: true,
    },
    {
      id: "mrr",
      header: "MRR",
      accessorFn: (row) => mrrSummaryMap.get(row.id)?.mrr_cents ?? -1,
      sortingFn: "basic",
      cell: ({ row }) => {
        const mrr = mrrSummaryMap.get(row.original.id);
        if (!mrr) return <span className="text-muted-foreground">—</span>;
        if (mrr.mrr_cents === 0) return <span>€0.00</span>;
        return (
          <span>€{(mrr.mrr_cents / 100).toFixed(2)}/mo</span>
        );
      },
      size: 100,
      enableHiding: true,
      enableSorting: true,
    },
    {
      header: "Members",
      accessorKey: "memberCount",
      cell: ({ row }) => {
        const memberCount = row.original.memberCount ?? 0;
        return (
          <Link
            to="/console/organizations/$orgId"
            params={{ orgId: row.original.id }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <UsersIcon size={14} />
            <span>{memberCount}</span>
          </Link>
        );
      },
      size: 100,
    },
    {
      header: "Short ID",
      accessorKey: "shortId",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.shortId}
        </span>
      ),
      size: 100,
      enableHiding: true,
    },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return date.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      },
      size: 160,
    },
    {
      id: "aiRequests",
      header: "AI Req (30d)",
      accessorFn: (row) => aiSummaryMap.get(row.id)?.requests ?? -1,
      sortingFn: "basic",
      cell: ({ row }) => {
        const summary = aiSummaryMap.get(row.original.id);
        if (!summary) return <span className="text-muted-foreground">—</span>;
        return <span>{summary.requests.toLocaleString()}</span>;
      },
      size: 110,
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "aiTokens",
      header: "AI Tokens (30d)",
      accessorFn: (row) => aiSummaryMap.get(row.id)?.total_tokens ?? -1,
      sortingFn: "basic",
      cell: ({ row }) => {
        const summary = aiSummaryMap.get(row.original.id);
        if (!summary) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="">{formatTokenCount(summary.total_tokens)}</span>
        );
      },
      size: 120,
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "aiCost",
      header: "AI Cost (30d)",
      accessorFn: (row) => {
        const s = aiSummaryMap.get(row.id);
        return s ? computeOrgEurCost(s) : -1;
      },
      sortingFn: "basic",
      cell: ({ row }) => {
        const summary = aiSummaryMap.get(row.original.id);
        if (!summary) return <span className="text-muted-foreground">—</span>;
        const cost = computeOrgEurCost(summary);
        return <span className="">€{cost.toFixed(5)}</span>;
      },
      size: 120,
      enableHiding: true,
      enableSorting: true,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => <RowActions row={row} />,
      size: 60,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

export default function OrgTable({ initialData }: OrgTableProps) {
  const id = useId();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    shortId: false,
    aiRequests: false,
    aiTokens: false,
    // aiCost visible by default
  });
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [data, setData] = useState<ConsoleOrg[]>(initialData.orgs);
  const [paginationMeta, setPaginationMeta] = useState<ConsolePaginationMeta>(
    initialData.pagination,
  );
  const [searchValue, setSearchValue] = useState("");
  const [planFilter, setPlanFilter] = useState<"" | "free" | "pro">("");

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: (initialData.pagination.page ?? 1) - 1,
    pageSize: initialData.pagination.limit ?? 25,
  });

  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  // True when the active sort column is handled server-side
  const isServerSort = !sorting[0] || !AI_SORT_COLS.has(sorting[0].id);

  // Cloud-only: load AI usage summary per org (fire-and-forget)
  const [aiSummaryMap, setAiSummaryMap] = useState<
    Map<string, ConsoleOrgAiSummary>
  >(new Map());
  useEffect(() => {
    if (import.meta.env.VITE_SAYR_EDITION !== "cloud") return;
    getConsoleOrgsAiSummary().then((summaries) => {
      const map = new Map<string, ConsoleOrgAiSummary>();
      for (const s of summaries) map.set(s.org_id, s);
      setAiSummaryMap(map);
    });
  }, []);

  // Load MRR summary per org (fire-and-forget, not cloud-gated)
  const [mrrSummaryMap, setMrrSummaryMap] = useState<
    Map<string, ConsoleOrgMrrSummary>
  >(new Map());
  useEffect(() => {
    getConsoleOrgsMrrSummary().then((summaries) => {
      const map = new Map<string, ConsoleOrgMrrSummary>();
      for (const s of summaries) map.set(s.org_id, s);
      setMrrSummaryMap(map);
    });
  }, []);

  const columns = buildColumns(aiSummaryMap, mrrSummaryMap);

  const fetchOrgs = useCallback(async (params: ConsoleOrgsParams) => {
    setIsLoading(true);
    try {
      const result = await getConsoleOrgs(params);
      if (result.success && result.data) {
        setData(result.data);
        if (result.pagination) {
          setPaginationMeta(result.pagination);
        }
      }
    } catch (err) {
      console.error("Failed to fetch organizations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(
    (overrides?: Partial<ConsoleOrgsParams>) => {
      const sortCol = sorting[0];
      // Skip server fetch when sorted by a client-side AI column
      if (sortCol && AI_SORT_COLS.has(sortCol.id)) return;
      const params: ConsoleOrgsParams = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: searchValue || undefined,
        plan: planFilter || undefined,
        sortBy: sortCol?.id || "createdAt",
        sortDirection: sortCol?.desc ? "desc" : "asc",
        ...overrides,
      };
      fetchOrgs(params);
    },
    [pagination, searchValue, planFilter, sorting, fetchOrgs],
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        refetch({ search: value || undefined, page: 1 });
      }, 300);
    },
    [refetch],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
      const nextCol = next[0];
      // Always reset to page 1 when sorting changes so the user sees the
      // first page of results for both client-side and server-side sorts.
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      if (!nextCol || !AI_SORT_COLS.has(nextCol.id)) {
        // Server-side column: trigger a refetch from page 1
      }
    },
    enableSortingRemoval: false,
    manualSorting: isServerSort,
    manualPagination: true,
    pageCount: paginationMeta.totalPages,
    rowCount: paginationMeta.totalItems,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      pagination,
      columnVisibility,
    },
  });

  const totalPages = paginationMeta.totalPages;
  const currentPage = pagination.pageIndex + 1;
  const pageSize = pagination.pageSize;
  const totalItems = paginationMeta.totalItems;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Input
              id={`${id}-input`}
              ref={inputRef}
              className={cn("peer min-w-60 ps-9", searchValue && "pe-9")}
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Filter by name or slug..."
              type="text"
              aria-label="Filter by name or slug"
            />
            <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
              <ListFilterIcon size={16} aria-hidden="true" />
            </div>
            {searchValue && (
              <button
                type="button"
                className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Clear filter"
                onClick={() => {
                  handleSearchChange("");
                  if (inputRef.current) {
                    inputRef.current.focus();
                  }
                }}
              >
                <CircleXIcon size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          {/* Plan filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <FilterIcon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                Plan
                {planFilter && (
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                    1
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto min-w-36 p-3" align="start">
              <div className="space-y-3">
                <div className="text-muted-foreground text-xs font-medium">
                  Plan Filters
                </div>
                <div className="space-y-3">
                  {(["free", "pro"] as const).map((value, i) => (
                    <div key={value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${id}-plan-${i}`}
                        checked={planFilter === value}
                        onCheckedChange={(checked: boolean) => {
                          setPlanFilter(checked ? value : "");
                          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                        }}
                      />
                      <Label
                        htmlFor={`${id}-plan-${i}`}
                        className="font-normal capitalize"
                      >
                        {value}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {/* Toggle column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Columns3Icon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                    onSelect={(event) => event.preventDefault()}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Loading indicator */}
          {isLoading && (
            <LoaderIcon
              size={16}
              className="animate-spin text-muted-foreground"
            />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-background overflow-hidden rounded-md border">
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: `${header.getSize()}px` }}
                    className="h-11"
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className={cn(
                          header.column.getCanSort() &&
                            "flex h-full w-full cursor-pointer items-center justify-between gap-2 select-none bg-transparent border-none p-0 text-left font-medium",
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                        onKeyDown={(e) => {
                          if (
                            header.column.getCanSort() &&
                            (e.key === "Enter" || e.key === " ")
                          ) {
                            e.preventDefault();
                            header.column.getToggleSortingHandler()?.(e);
                          }
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {{
                          asc: (
                            <ChevronUpIcon
                              className="shrink-0 opacity-60"
                              size={16}
                              aria-hidden="true"
                            />
                          ),
                          desc: (
                            <ChevronDownIcon
                              className="shrink-0 opacity-60"
                              size={16}
                              aria-hidden="true"
                            />
                          ),
                        }[header.column.getIsSorted() as string] ?? null}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="last:py-0">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {isLoading ? "Loading..." : "No results."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <Label htmlFor={id} className="max-sm:sr-only">
            Rows per page
          </Label>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPagination({ pageIndex: 0, pageSize: Number(value) });
            }}
          >
            <SelectTrigger id={id} className="w-fit whitespace-nowrap">
              <SelectValue placeholder="Select number of results" />
            </SelectTrigger>
            <SelectContent className="[&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2">
              {[5, 10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-muted-foreground flex grow justify-end text-sm whitespace-nowrap">
          <p
            className="text-muted-foreground text-sm whitespace-nowrap"
            aria-live="polite"
          >
            <span className="text-foreground">
              {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, totalItems)}
            </span>{" "}
            of <span className="text-foreground">{totalItems}</span>
          </p>
        </div>
        <div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                  }
                  disabled={currentPage <= 1}
                  aria-label="Go to first page"
                >
                  <ChevronFirstIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      pageIndex: prev.pageIndex - 1,
                    }))
                  }
                  disabled={currentPage <= 1}
                  aria-label="Go to previous page"
                >
                  <ChevronLeftIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      pageIndex: prev.pageIndex + 1,
                    }))
                  }
                  disabled={currentPage >= totalPages}
                  aria-label="Go to next page"
                >
                  <ChevronRightIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      pageIndex: totalPages - 1,
                    }))
                  }
                  disabled={currentPage >= totalPages}
                  aria-label="Go to last page"
                >
                  <ChevronLastIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}

function RowActions({ row }: { row: { original: ConsoleOrg } }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="shadow-none"
            aria-label="Organization actions"
          >
            <EllipsisIcon size={16} aria-hidden="true" />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              to="/console/organizations/$orgId"
              params={{ orgId: row.original.id }}
            >
              View Organization
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
