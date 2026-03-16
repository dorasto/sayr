"use client";

import {
  AlertDialog,
  AlertDialogAction,
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
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { IconCheck, IconX } from "@tabler/icons-react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type PaginationState,
  type Row,
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
  CircleAlertIcon,
  CircleXIcon,
  Columns3Icon,
  EllipsisIcon,
  FilterIcon,
  ListFilterIcon,
  LoaderIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  BuildingIcon,
} from "lucide-react";
import { useCallback, useId, useRef, useState, useEffect } from "react";
import { useLayoutData } from "../generic/Context";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import {
  consoleSetUserRoleAction,
  getConsoleUsers,
  type ConsoleUser,
  type ConsolePaginationMeta,
  type ConsoleUsersParams,
} from "@/lib/fetches/console";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Link } from "@tanstack/react-router";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";

// Props for the component
type UserTableProps = {
  initialData: {
    users: ConsoleUser[];
    pagination: ConsolePaginationMeta;
  };
};

const columns: ColumnDef<ConsoleUser>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    size: 28,
    enableSorting: false,
    enableHiding: false,
  },
  {
    header: "User",
    accessorKey: "name",
    cell: ({ row }) => (
      <Link
        to="/console/users/$userId"
        params={{ userId: row.original.id }}
        className="flex items-center gap-3 hover:underline"
      >
        {row.original.image ? (
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={row.original.image} alt={row.original.name} />
            <AvatarFallback className="rounded-lg uppercase">
              {row.original.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
            <UserIcon size={14} className="text-muted-foreground" />
          </div>
        )}
        <div>
          <div className="font-medium">{row.getValue("name")}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.email}
          </div>
        </div>
      </Link>
    ),
    size: 250,
    enableHiding: false,
  },
  {
    header: "Role",
    accessorKey: "role",
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.role || "User"}</Badge>
    ),
    size: 120,
  },
  {
    header: "Status",
    id: "status",
    accessorFn: (row) => {
      if (row.banned) return "Banned";
      if (row.emailVerified) return "Active";
      return "Pending";
    },
    cell: ({ row }) => {
      const user = row.original;
      let status: string;
      let variant: "default" | "secondary" | "destructive" | "outline" =
        "default";

      if (user.banned) {
        status = "Banned";
        variant = "destructive";
      } else if (user.emailVerified) {
        status = "Active";
        variant = "secondary";
      } else {
        status = "Pending";
        variant = "outline";
      }

      return <Badge variant={variant}>{status}</Badge>;
    },
    size: 100,
  },
  {
    header: "Organizations",
    accessorKey: "organizationCount",
    cell: ({ row }) => {
      const count = row.original.organizationCount ?? 0;
      return (
        <Link
          to="/console/users/$userId"
          params={{ userId: row.original.id }}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <BuildingIcon size={14} />
          <span>{count}</span>
        </Link>
      );
    },
    size: 120,
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
    header: "Email Verified",
    accessorKey: "emailVerified",
    cell: ({ row }) => (
      <Badge variant="secondary">
        {row.original.emailVerified ? (
          <IconCheck size={16} />
        ) : (
          <IconX size={16} />
        )}
      </Badge>
    ),
    size: 120,
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

export default function UserTable({ initialData }: UserTableProps) {
  const { serverEvents } = useLayoutData();
  useServerEventsSubscription({ serverEvents });

  const id = useId();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Server-side state
  const [data, setData] = useState<ConsoleUser[]>(initialData.users);
  const [paginationMeta, setPaginationMeta] = useState<ConsolePaginationMeta>(
    initialData.pagination,
  );
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "" | "active" | "banned" | "pending"
  >("");
  const [roleFilter, setRoleFilter] = useState<"" | "admin" | "user">("");

  // TanStack Table pagination state (driven by server response)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: (initialData.pagination.page ?? 1) - 1,
    pageSize: initialData.pagination.limit ?? 25,
  });

  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  // Fetch data from server
  const fetchUsers = useCallback(async (params: ConsoleUsersParams) => {
    setIsLoading(true);
    try {
      const result = await getConsoleUsers(params);
      if (result.success && result.data) {
        setData(result.data);
        if (result.pagination) {
          setPaginationMeta(result.pagination);
        }
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Build params from current state and fetch
  const refetch = useCallback(
    (overrides?: Partial<ConsoleUsersParams>) => {
      const sortCol = sorting[0];
      const params: ConsoleUsersParams = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: searchValue || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
        sortBy: sortCol?.id || "createdAt",
        sortDirection: sortCol?.desc ? "desc" : "asc",
        ...overrides,
      };
      fetchUsers(params);
    },
    [pagination, searchValue, statusFilter, roleFilter, sorting, fetchUsers],
  );

  // Re-fetch when pagination, sorting, or filters change
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Debounced search
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

  const handleDeleteRows = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const updatedData = data.filter(
      (item) => !selectedRows.some((row) => row.original.id === item.id),
    );
    setData(updatedData);
    table.resetRowSelection();
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    enableSortingRemoval: false,
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
              placeholder="Filter by name or email..."
              type="text"
              aria-label="Filter by name or email"
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
          {/* Status filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <FilterIcon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                Status
                {statusFilter && (
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                    1
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto min-w-36 p-3" align="start">
              <div className="space-y-3">
                <div className="text-muted-foreground text-xs font-medium">
                  Status Filters
                </div>
                <div className="space-y-3">
                  {(["active", "banned", "pending"] as const).map(
                    (value, i) => (
                      <div key={value} className="flex items-center gap-2">
                        <Checkbox
                          id={`${id}-status-${i}`}
                          checked={statusFilter === value}
                          onCheckedChange={(checked: boolean) => {
                            setStatusFilter(checked ? value : "");
                            setPagination((prev) => ({
                              ...prev,
                              pageIndex: 0,
                            }));
                          }}
                        />
                        <Label
                          htmlFor={`${id}-status-${i}`}
                          className="font-normal capitalize"
                        >
                          {value}
                        </Label>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {/* Role filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <FilterIcon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                Role
                {roleFilter && (
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                    1
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto min-w-36 p-3" align="start">
              <div className="space-y-3">
                <div className="text-muted-foreground text-xs font-medium">
                  Role Filters
                </div>
                <div className="space-y-3">
                  {(["admin", "user"] as const).map((value, i) => (
                    <div key={value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${id}-role-${i}`}
                        checked={roleFilter === value}
                        onCheckedChange={(checked: boolean) => {
                          setRoleFilter(checked ? value : "");
                          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                        }}
                      />
                      <Label
                        htmlFor={`${id}-role-${i}`}
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
          {/* Toggle columns visibility */}
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
        <div className="flex items-center gap-3">
          {/* Delete button */}
          {table.getSelectedRowModel().rows.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="ml-auto" variant="outline">
                  <TrashIcon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  Delete
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                    {table.getSelectedRowModel().rows.length}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border"
                    aria-hidden="true"
                  >
                    <CircleAlertIcon className="opacity-80" size={16} />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete{" "}
                      {table.getSelectedRowModel().rows.length} selected{" "}
                      {table.getSelectedRowModel().rows.length === 1
                        ? "row"
                        : "rows"}
                      .
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteRows}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {/* Add user button */}
          <Button className="ml-auto" variant="outline">
            <PlusIcon
              className="-ms-1 opacity-60"
              size={16}
              aria-hidden="true"
            />
            Add user
          </Button>
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
        {/* Results per page */}
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
        {/* Page number information */}
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

        {/* Pagination buttons */}
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

function RowActions({ row }: { row: Row<ConsoleUser> }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = async (newRole: "admin" | "user") => {
    setIsLoading(true);
    try {
      headlessToast.loading({
        title: "Updating user role...",
        id: `user-role-update-${row.original.id}`,
      });
      const result = await consoleSetUserRoleAction(row.original.id, newRole);
      if (result.success) {
        headlessToast.success({
          title: "User role updated",
          description: `The role has been changed to ${newRole}.`,
          id: `user-role-update-${row.original.id}`,
        });
      } else {
        headlessToast.error({
          title: "Role change failed",
          description: result.error || "An unknown error occurred.",
          id: `user-role-update-${row.original.id}`,
        });
      }
    } catch (error) {
      console.error("Role change error:", error);
      headlessToast.error({
        title: "Role change failed",
        description: "An unknown error occurred.",
        id: `user-role-update-${row.original.id}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="shadow-none"
            aria-label="Edit user"
            disabled={isLoading}
          >
            <EllipsisIcon size={16} aria-hidden="true" />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              to="/console/users/$userId"
              params={{ userId: row.original.id }}
            >
              <span>View Profile</span>
              <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <span>Edit User</span>
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <span>Reset Password</span>
            <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Change Role</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() => handleRoleChange("admin")}
                  disabled={isLoading || row.original.role === "admin"}
                >
                  Admin {row.original.role === "admin" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleRoleChange("user")}
                  disabled={
                    isLoading ||
                    !row.original.role ||
                    row.original.role === "user"
                  }
                >
                  User{" "}
                  {(!row.original.role || row.original.role === "user") && "✓"}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            {row.original.banned ? "Unban User" : "Ban User"}
          </DropdownMenuItem>
          <DropdownMenuItem>Send Email</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <span>Delete User</span>
          <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
