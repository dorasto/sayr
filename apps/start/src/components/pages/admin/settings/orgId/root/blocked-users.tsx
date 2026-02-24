"use client";

import type { schema } from "@repo/database";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@repo/ui/components/sheet";
import { Spinner } from "@repo/ui/components/spinner";
import {
	IconBan,
	IconSearch,
	IconUser,
	IconUserMinus,
	IconUserPlus,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import {
	blockUserAction,
	getBlockedUsersAction,
	searchOrgInteractorsAction,
	unblockUserAction,
} from "@/lib/fetches/organization";
import { useToastAction } from "@/lib/util";

export function BlockedUsersSheet({ children }: { children: React.ReactNode }) {
	const { organization } = useLayoutOrganizationSettings();
	const orgId = organization.id;
	const queryClient = useQueryClient();
	const { runWithToast } = useToastAction();

	const [open, setOpen] = useState(false);
	const [searchInput, setSearchInput] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");

	// Debounce search input — 300ms delay, matching the mention pattern
	useEffect(() => {
		if (searchInput.length === 0) {
			setDebouncedQuery("");
			return;
		}
		const timer = setTimeout(() => {
			setDebouncedQuery(searchInput);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchInput]);

	// Fetch blocked users list
	const blockedQuery = useQuery<schema.BlockedUserWithDetails[]>({
		queryKey: ["blockedUsers", orgId],
		queryFn: () => getBlockedUsersAction(orgId),
		enabled: open,
		staleTime: 1000 * 60 * 2,
	});

	// Search interactors — only fires when debounced query is >= 2 chars
	const searchQuery = useQuery<schema.UserSummary[]>({
		queryKey: ["blockedUsersSearch", orgId, debouncedQuery],
		queryFn: () => searchOrgInteractorsAction(orgId, debouncedQuery, 20),
		enabled: open && debouncedQuery.length >= 2,
		staleTime: 1000 * 60 * 2,
	});

	const blockedUsers = blockedQuery.data ?? [];
	const blockedUserIds = new Set(blockedUsers.map((b) => b.userId));
	const searchResults = searchQuery.data ?? [];

	// Filter out already-blocked users from search results
	const filteredSearchResults = searchResults.filter((u) => !blockedUserIds.has(u.id));

	const isSearchWaiting = searchInput.length >= 2 && searchInput !== debouncedQuery;
	const isSearchLoading = isSearchWaiting || (debouncedQuery.length >= 2 && searchQuery.isFetching);

	const handleBlock = async (user: schema.UserSummary) => {
		await runWithToast(
			`block-user-${user.id}`,
			{
				loading: { title: "Blocking user...", description: `Blocking ${user.name}` },
				success: { title: "User blocked", description: `${user.name} has been blocked.` },
				error: { title: "Failed to block user", description: "An error occurred." },
			},
			async () => {
				const result = await blockUserAction(orgId, user.id);
				if (result.success) {
					await queryClient.invalidateQueries({ queryKey: ["blockedUsers", orgId] });
					await queryClient.invalidateQueries({ queryKey: ["blockedUsersSearch", orgId] });
				}
				return result;
			},
		);
	};

	const handleUnblock = async (userId: string, userName: string) => {
		await runWithToast(
			`unblock-user-${userId}`,
			{
				loading: { title: "Unblocking user...", description: `Unblocking ${userName}` },
				success: { title: "User unblocked", description: `${userName} has been unblocked.` },
				error: { title: "Failed to unblock user", description: "An error occurred." },
			},
			async () => {
				const result = await unblockUserAction(orgId, userId);
				if (result.success) {
					await queryClient.invalidateQueries({ queryKey: ["blockedUsers", orgId] });
					await queryClient.invalidateQueries({ queryKey: ["blockedUsersSearch", orgId] });
				}
				return result;
			},
		);
	};

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>{children}</SheetTrigger>
			<SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
				<SheetHeader className="px-4 py-3 border-b">
					<SheetTitle className="flex items-center gap-2">
						<IconBan className="size-5" />
						Blocked Users
					</SheetTitle>
					<SheetDescription>
						Block external users from interacting with your organization's tasks.
					</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col flex-1 overflow-hidden">
					{/* Search section */}
					<div className="px-4 py-3 border-b">
						<Label variant={"subheading"} className="mb-2">
							Search users to block
						</Label>
						<div className="relative">
							<IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
							<Input
								placeholder="Search by name (min 2 characters)..."
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								className="pl-8"
							/>
						</div>

						{/* Search results */}
						{debouncedQuery.length >= 2 && (
							<div className="mt-2 max-h-48 overflow-y-auto">
								{isSearchLoading ? (
									<div className="flex items-center justify-center py-4 gap-2 text-muted-foreground text-sm">
										<Spinner />
										Searching...
									</div>
								) : filteredSearchResults.length > 0 ? (
									<div className="flex flex-col gap-1">
										{filteredSearchResults.map((user) => (
											<div
												key={user.id}
												className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-accent"
											>
												<div className="flex items-center gap-2 min-w-0">
													<Avatar className="size-7 rounded-full shrink-0">
														<AvatarImage src={user.image || ""} alt={user.name} />
														<AvatarFallback className="rounded-full uppercase text-xs">
															<IconUser className="size-4" />
														</AvatarFallback>
													</Avatar>
													<div className="min-w-0">
														<p className="text-sm font-medium truncate">{user.displayName || user.name}</p>
														{user.displayName && user.displayName !== user.name && (
															<p className="text-xs text-muted-foreground truncate">{user.name}</p>
														)}
													</div>
												</div>
												<Button
													variant="destructive"
													size="sm"
													className="shrink-0 gap-1 h-7 text-xs"
													onClick={() => handleBlock(user)}
												>
													<IconUserPlus className="size-3.5" />
													Block
												</Button>
											</div>
										))}
									</div>
								) : (
									<p className="text-sm text-muted-foreground text-center py-4">
										No matching users found.
									</p>
								)}
							</div>
						)}

						{searchInput.length > 0 && searchInput.length < 2 && (
							<p className="text-xs text-muted-foreground mt-1.5">
								Type at least 2 characters to search.
							</p>
						)}
					</div>

					{/* Blocked users list */}
					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="px-4 py-2 border-b">
							<Label variant={"subheading"} className="flex items-center gap-2">
								Currently blocked
								{blockedUsers.length > 0 && (
									<Badge variant="secondary" className="h-5 text-xs">
										{blockedUsers.length}
									</Badge>
								)}
							</Label>
						</div>

						<ScrollArea className="flex-1">
							{blockedQuery.isLoading ? (
								<div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
									<Spinner />
									Loading...
								</div>
							) : blockedUsers.length > 0 ? (
								<div className="flex flex-col">
									{blockedUsers.map((blocked) => (
										<div
											key={blocked.id}
											className="flex items-center justify-between gap-2 px-4 py-2.5 border-b last:border-b-0 hover:bg-accent/50"
										>
											<div className="flex items-center gap-2.5 min-w-0">
												<Avatar className="size-8 rounded-full shrink-0">
													<AvatarImage src={blocked.user.image || ""} alt={blocked.user.name} />
													<AvatarFallback className="rounded-full uppercase text-xs">
														<IconUser className="size-4" />
													</AvatarFallback>
												</Avatar>
												<div className="min-w-0">
													<p className="text-sm font-medium truncate">
														{blocked.user.displayName || blocked.user.name}
													</p>
													<p className="text-xs text-muted-foreground truncate">
														Blocked by {blocked.blockedByUser.displayName || blocked.blockedByUser.name}
														{blocked.reason && ` — ${blocked.reason}`}
													</p>
												</div>
											</div>
											<Button
												variant="outline"
												size="sm"
												className="shrink-0 gap-1 h-7 text-xs"
												onClick={() => handleUnblock(blocked.userId, blocked.user.name)}
											>
												<IconUserMinus className="size-3.5" />
												Unblock
											</Button>
										</div>
									))}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
									<IconBan className="size-8 mb-2 opacity-50" />
									<p className="text-sm">No blocked users</p>
									<p className="text-xs">Search above to block users from interacting with your organization.</p>
								</div>
							)}
						</ScrollArea>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
