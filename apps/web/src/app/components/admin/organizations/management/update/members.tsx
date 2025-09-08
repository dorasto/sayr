"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
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
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { cn } from "@repo/ui/lib/utils";
import { IconMail, IconUsers } from "@tabler/icons-react";
import {
	type ColumnDef,
	type ColumnFiltersState,
	type FilterFn,
	flexRender,
	getCoreRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getSortedRowModel,
	type Row,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import {
	ChevronDownIcon,
	ChevronUpIcon,
	CircleXIcon,
	Columns3Icon,
	Crown,
	EllipsisIcon,
	EyeIcon,
	EyeOffIcon,
	FilterIcon,
	ListFilterIcon,
	PlusIcon,
	Shield,
	User,
	UserIcon,
} from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLayoutData } from "@/app/admin/Context";

// Email obfuscation utility
const obfuscateEmail = (email: string): string => {
	const [localPart, domain] = email.split("@");

	if (!localPart || !domain) return email;

	// Obfuscate local part
	let obfuscatedLocal = localPart;
	if (localPart.length > 2) {
		const firstChar = localPart[0];
		const lastChar = localPart[localPart.length - 1];
		const middleLength = Math.max(2, localPart.length - 2);
		obfuscatedLocal = `${firstChar}${"*".repeat(middleLength)}${lastChar}`;
	} else if (localPart.length === 2) {
		obfuscatedLocal = `${localPart[0]}*`;
	}

	// Obfuscate domain
	let obfuscatedDomain = domain;
	const domainParts = domain.split(".");
	if (domainParts.length >= 2) {
		const name = domainParts[0];
		const extension = domainParts.slice(1).join(".");

		if (name && name.length > 2) {
			const firstChar = name[0];
			const lastChar = name[name.length - 1];
			const middleLength = Math.max(1, name.length - 2);
			obfuscatedDomain = `${firstChar}${"*".repeat(middleLength)}${lastChar}.${extension}`;
		} else if (name && name.length === 2) {
			obfuscatedDomain = `${name[0]}*.${extension}`;
		}
	}

	return `${obfuscatedLocal}@${obfuscatedDomain}`;
};

// Email display component with obfuscation toggle
function ObfuscatedEmail({ email, className }: { email: string; className?: string }) {
	const [isRevealed, setIsRevealed] = useState(false);

	return (
		<div className="flex items-center gap-1 group/email">
			<button
				type="button"
				className="p-0 hover:bg-transparent text-transparent hover:text-muted-foreground flex items-center gap-1"
				onClick={() => setIsRevealed(!isRevealed)}
				aria-label={isRevealed ? "Hide email" : "Show email"}
			>
				<span className={cn("text-sm text-muted-foreground", className)}>
					{isRevealed ? email : obfuscateEmail(email)}
				</span>
				{isRevealed ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
			</button>
		</div>
	);
}

// Types from the organization schema
type Member = {
	id: string;
	organizationId: string;
	role: "member" | "admin" | "owner";
	createdAt: Date;
	userId: string;
	user: {
		email: string;
		name: string;
		image?: string | undefined;
	};
};

type Invitation = {
	id: string;
	organizationId: string;
	email: string;
	role: "member" | "admin" | "owner";
	status: string;
	inviterId: string;
	expiresAt: Date;
};

// Custom filter function for multi-column searching
const multiColumnFilterFn: FilterFn<Member> = (row, _columnId, filterValue) => {
	const searchableRowContent =
		`${row.original.user.name} ${row.original.user.email} ${row.original.role}`.toLowerCase();
	const searchTerm = (filterValue ?? "").toLowerCase();
	return searchableRowContent.includes(searchTerm);
};

const roleFilterFn: FilterFn<Member> = (row, _columnId, filterValue: string[]) => {
	if (!filterValue?.length) return true;
	return filterValue.includes(row.original.role);
};

// Table columns for members
const memberColumns: ColumnDef<Member>[] = [
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
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
		header: "Member",
		accessorKey: "user.name",
		cell: ({ row }) => (
			<div className="flex items-center gap-3 select-none">
				{row.original.user.image ? (
					<Avatar className="h-8 w-8 rounded-lg">
						<AvatarImage src={row.original.user.image} alt={row.original.user.name} />
						<AvatarFallback className="rounded-lg uppercase">{row.original.user.name.slice(0, 2)}</AvatarFallback>
					</Avatar>
				) : (
					<div className="flex size-8 items-center justify-center rounded-full bg-muted">
						<UserIcon size={14} className="text-muted-foreground" />
					</div>
				)}
				<div>
					<div className="font-medium">{row.original.user.name}</div>
					<ObfuscatedEmail email={row.original.user.email} />
				</div>
			</div>
		),

		filterFn: multiColumnFilterFn,
		enableHiding: false,
	},
	{
		header: "Role",
		accessorKey: "role",
		cell: ({ row }) => {
			const role = row.original.role;
			const getRoleIcon = (role: "member" | "admin" | "owner") => {
				switch (role) {
					case "owner":
						return <Crown className="h-4 w-4" />;
					case "admin":
						return <Shield className="h-4 w-4" />;
					case "member":
						return <User className="h-4 w-4" />;
				}
			};

			const getRoleBadgeVariant = (role: "member" | "admin" | "owner") => {
				switch (role) {
					case "owner":
						return "destructive" as const;
					case "admin":
						return "default" as const;
					case "member":
						return "secondary" as const;
				}
			};

			return (
				<Badge variant={getRoleBadgeVariant(role)} className="flex items-center gap-1 w-fit pointer-events-none">
					{getRoleIcon(role)}
					{role.charAt(0).toUpperCase() + role.slice(1)}
				</Badge>
			);
		},

		filterFn: roleFilterFn,
	},
	{
		header: "Joined",
		accessorKey: "createdAt",
		cell: ({ row }) => {
			const date = new Date(row.getValue("createdAt"));
			return date.toLocaleString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "numeric",
				minute: "numeric",
				hour12: false,
				formatMatcher: "best fit",
			});
		},
		size: 100,
	},
	{
		id: "actions",
		header: () => <span className="sr-only">Actions</span>,
		cell: ({ row }) => <MemberRowActions row={row} />,
		size: 10,
		enableHiding: false,
	},
];

// biome-ignore lint/suspicious/noExplicitAny: <will fix>
export default function OrganizationMembers({ members }: { members: any[] }) {
	const id = useId();
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [sorting, setSorting] = useState<SortingState>([
		{
			id: "user.name",
			desc: false,
		},
	]);
	const inputRef = useRef<HTMLInputElement>(null);

	// Get members and invitations, with fallbacks for when organization is null
	// biome-ignore lint/suspicious/noExplicitAny: <will fix>
	const invitations: any[] = [];

	const table = useReactTable({
		data: members,
		columns: memberColumns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		enableSortingRemoval: false,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		getFilteredRowModel: getFilteredRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		state: {
			sorting,
			columnFilters,
			columnVisibility,
		},
	});

	// Get unique role values
	const uniqueRoleValues = useMemo(() => {
		const roleColumn = table.getColumn("role");
		if (!roleColumn) return [];
		const values = Array.from(roleColumn.getFacetedUniqueValues().keys()) as string[];
		return values.sort();
	}, [table]);

	// Get counts for each role
	const roleCounts = useMemo(() => {
		const roleColumn = table.getColumn("role");
		if (!roleColumn) return new Map();
		return roleColumn.getFacetedUniqueValues();
	}, [table]);

	const selectedRoles = useMemo(() => {
		const filterValue = table.getColumn("role")?.getFilterValue() as string[];
		return filterValue ?? [];
	}, [table]);

	const handleRoleFilterChange = (checked: boolean, value: string) => {
		const filterValue = table.getColumn("role")?.getFilterValue() as string[];
		const newFilterValue = filterValue ? [...filterValue] : [];

		if (checked) {
			newFilterValue.push(value);
		} else {
			const index = newFilterValue.indexOf(value);
			if (index > -1) {
				newFilterValue.splice(index, 1);
			}
		}

		table.getColumn("role")?.setFilterValue(newFilterValue.length ? newFilterValue : undefined);
	};

	const handleInviteUser = () => {
		// TODO: Implement invite user functionality
		toast.info("Invite user functionality not implemented yet");
	};

	// Filter invitations based on search term for display
	const searchTerm = (table.getColumn("user.name")?.getFilterValue() ?? "") as string;
	const filteredInvitations = useMemo(() => {
		if (!searchTerm) return invitations;
		return invitations.filter((invitation) => invitation.email.toLowerCase().includes(searchTerm.toLowerCase()));
	}, [searchTerm]);

	if (!members) {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<IconUsers className="h-12 w-12 text-muted-foreground mb-4" />
				<p className="text-muted-foreground">No organization selected</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					{/* Filter by name or email */}
					<div className="relative">
						<Input
							id={`${id}-input`}
							ref={inputRef}
							className={cn(
								"peer min-w-60 ps-9 bg-popover",
								Boolean(table.getColumn("user.name")?.getFilterValue()) && "pe-9"
							)}
							value={(table.getColumn("user.name")?.getFilterValue() ?? "") as string}
							onChange={(e) => table.getColumn("user.name")?.setFilterValue(e.target.value)}
							placeholder="Filter by name or email..."
							type="text"
							aria-label="Filter by name or email"
						/>
						<div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
							<ListFilterIcon size={16} aria-hidden="true" />
						</div>
						{Boolean(table.getColumn("user.name")?.getFilterValue()) && (
							<button
								type="button"
								className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
								aria-label="Clear filter"
								onClick={() => {
									table.getColumn("user.name")?.setFilterValue("");
									if (inputRef.current) {
										inputRef.current.focus();
									}
								}}
							>
								<CircleXIcon size={16} aria-hidden="true" />
							</button>
						)}
					</div>
					{/* Filter by role */}
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline">
								<FilterIcon className="-ms-1 opacity-60" size={16} aria-hidden="true" />
								Role
								{selectedRoles.length > 0 && (
									<span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
										{selectedRoles.length}
									</span>
								)}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto min-w-36 p-3" align="start">
							<div className="space-y-3">
								<div className="text-muted-foreground text-xs font-medium">Role Filters</div>
								<div className="space-y-3">
									{uniqueRoleValues.map((value, i) => (
										<div key={value} className="flex items-center gap-2">
											<Checkbox
												id={`${id}-role-${i}`}
												checked={selectedRoles.includes(value)}
												onCheckedChange={(checked: boolean) => handleRoleFilterChange(checked, value)}
											/>
											<Label
												htmlFor={`${id}-role-${i}`}
												className="flex grow justify-between gap-2 font-normal"
											>
												{value.charAt(0).toUpperCase() + value.slice(1)}{" "}
												<span className="text-muted-foreground ms-2 text-xs">{roleCounts.get(value)}</span>
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
								<Columns3Icon className="-ms-1 opacity-60" size={16} aria-hidden="true" />
								View
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
							{table
								.getAllColumns()
								.filter((column) => column.getCanHide())
								.map((column) => {
									return (
										<DropdownMenuCheckboxItem
											key={column.id}
											className="capitalize"
											checked={column.getIsVisible()}
											onCheckedChange={(value) => column.toggleVisibility(!!value)}
											onSelect={(event) => event.preventDefault()}
										>
											{column.id === "user.name" ? "Member" : column.id}
										</DropdownMenuCheckboxItem>
									);
								})}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<div className="flex items-center gap-3">
					{/* Invite member button */}
					<Button onClick={handleInviteUser} variant="outline">
						<PlusIcon className="-ms-1 opacity-60" size={16} aria-hidden="true" />
						Invite Member
					</Button>
				</div>
			</div>

			{/* Members Table */}
			<div className="bg-popover overflow-hidden rounded-md border">
				<Table className="table-fixed select-none">
					<TableHeader className="bg-accent">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className="hover:bg-transparent">
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id} style={{ width: `${header.getSize()}px` }} className="h-11">
											{header.isPlaceholder ? null : header.column.getCanSort() ? (
												<button
													type="button"
													className={cn(
														header.column.getCanSort() &&
															"flex h-full w-full cursor-pointer items-center justify-between gap-2 select-none bg-transparent border-none p-0 text-left text-accent-foreground font-medium"
													)}
													onClick={header.column.getToggleSortingHandler()}
													onKeyDown={(e) => {
														if (header.column.getCanSort() && (e.key === "Enter" || e.key === " ")) {
															e.preventDefault();
															header.column.getToggleSortingHandler()?.(e);
														}
													}}
												>
													{flexRender(header.column.columnDef.header, header.getContext())}
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
												flexRender(header.column.columnDef.header, header.getContext())
											)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id} className="last:py-0">
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={memberColumns.length} className="h-24 text-center">
									<div className="flex flex-col items-center justify-center">
										<IconUsers className="h-8 w-8 text-muted-foreground mb-2" />
										<p className="text-muted-foreground">
											{searchTerm ? "No members found" : "No members yet"}
										</p>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pending Invitations */}
			{filteredInvitations.length > 0 && (
				<div className="space-y-4">
					<h4 className="text-sm font-medium text-muted-foreground">
						Pending Invitations ({filteredInvitations.length})
					</h4>

					<div className="border rounded-lg">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Email</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Expires</TableHead>
									<TableHead className="w-[50px]"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredInvitations.map((invitation) => (
									<TableRow key={invitation.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
													<IconMail className="h-4 w-4 text-muted-foreground" />
												</div>
												<div>
													<ObfuscatedEmail email={invitation.email} className="font-medium" />
													<p className="text-sm text-muted-foreground">Invited</p>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<Badge
												variant={
													invitation.role === "owner"
														? "destructive"
														: invitation.role === "admin"
															? "default"
															: "secondary"
												}
												className="flex items-center gap-1 w-fit"
											>
												{invitation.role === "owner" ? (
													<Crown className="h-4 w-4" />
												) : invitation.role === "admin" ? (
													<Shield className="h-4 w-4" />
												) : (
													<User className="h-4 w-4" />
												)}
												{invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
											</Badge>
										</TableCell>
										<TableCell>
											<Badge variant="outline">{invitation.status}</Badge>
										</TableCell>
										<TableCell className="text-muted-foreground">
											{new Date(invitation.expiresAt).toLocaleDateString()}
										</TableCell>
										<TableCell>
											<InvitationRowActions invitation={invitation} />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			)}
		</div>
	);
}

function MemberRowActions({ row }: { row: Row<Member> }) {
	const [isLoading, setIsLoading] = useState(false);

	const handleRoleChange = async (newRole: "member" | "admin" | "owner") => {
		setIsLoading(true);
		try {
			// TODO: Implement role change functionality
			toast.info(`Role change to ${newRole} not implemented yet`);
		} catch (error) {
			console.error("Role change error:", error);
			toast.error("Failed to update member role");
		} finally {
			setIsLoading(false);
		}
	};

	const handleRemoveMember = async () => {
		setIsLoading(true);
		try {
			// TODO: Implement remove member functionality
			toast.info("Remove member functionality not implemented yet");
		} catch (error) {
			console.error("Remove member error:", error);
			toast.error("Failed to remove member");
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
						aria-label="Edit member"
						disabled={isLoading}
					>
						<EllipsisIcon size={16} aria-hidden="true" />
					</Button>
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{row.original.role !== "owner" && (
					<>
						<DropdownMenuGroup>
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>Change Role</DropdownMenuSubTrigger>
								<DropdownMenuPortal>
									<DropdownMenuSubContent>
										<DropdownMenuItem
											onClick={() => handleRoleChange("admin")}
											disabled={isLoading || row.original.role === "admin"}
										>
											<Shield className="h-4 w-4 mr-2" />
											Admin {row.original.role === "admin" && "✓"}
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => handleRoleChange("member")}
											disabled={isLoading || row.original.role === "member"}
										>
											<User className="h-4 w-4 mr-2" />
											Member {row.original.role === "member" && "✓"}
										</DropdownMenuItem>
									</DropdownMenuSubContent>
								</DropdownMenuPortal>
							</DropdownMenuSub>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={handleRemoveMember}
							className="text-destructive focus:text-destructive"
							disabled={isLoading}
						>
							Remove from organization
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function InvitationRowActions({ invitation }: { invitation: Invitation }) {
	const [isLoading, setIsLoading] = useState(false);

	const handleResendInvitation = async () => {
		setIsLoading(true);
		try {
			// TODO: Implement resend invitation functionality
			console.log("Resending invitation for:", invitation.email);
			toast.info("Resend invitation functionality not implemented yet");
		} catch (error) {
			console.error("Resend invitation error:", error);
			toast.error("Failed to resend invitation");
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancelInvitation = async () => {
		setIsLoading(true);
		try {
			// TODO: Implement cancel invitation functionality
			console.log("Canceling invitation for:", invitation.email);
			toast.info("Cancel invitation functionality not implemented yet");
		} catch (error) {
			console.error("Cancel invitation error:", error);
			toast.error("Failed to cancel invitation");
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
						aria-label="Manage invitation"
						disabled={isLoading}
					>
						<EllipsisIcon size={16} aria-hidden="true" />
					</Button>
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={handleResendInvitation} disabled={isLoading}>
					Resend invitation
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={handleCancelInvitation}
					className="text-destructive focus:text-destructive"
					disabled={isLoading}
				>
					Cancel invitation
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
