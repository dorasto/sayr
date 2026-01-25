"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Calendar } from "@repo/ui/components/calendar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { IconCalendarEvent, IconCheck, IconX } from "@tabler/icons-react";
import { formatDate } from "@repo/util";
import type { schema } from "@repo/database";
import { useState, useEffect } from "react";
import { releaseStatusConfig, RELEASE_STATUS_ORDER } from "./config";

interface ReleaseHeaderProps {
	release: schema.ReleaseWithTasks;
	onStatusUpdate: (status: schema.releaseType["status"]) => void;
	onTargetDateUpdate: (date: Date | null) => void;
	onReleasedAtUpdate: (date: Date | null) => void;
	onUpdate: (data: { name: string; slug: string }) => void;
}

export function ReleaseHeader({
	release,
	onStatusUpdate,
	onTargetDateUpdate,
	onReleasedAtUpdate,
	onUpdate,
}: ReleaseHeaderProps) {
	const [editName, setEditName] = useState(release.name);
	const [editSlug, setEditSlug] = useState(release.slug);

	// Reset form when release changes
	useEffect(() => {
		setEditName(release.name);
		setEditSlug(release.slug);
	}, [release.name, release.slug]);

	const handleNameBlur = () => {
		if (editName !== release.name && editName.trim()) {
			onUpdate({ name: editName, slug: editSlug });
		} else if (!editName.trim()) {
			// Reset to original if empty
			setEditName(release.name);
		}
	};

	const handleSlugBlur = () => {
		if (editSlug !== release.slug && editSlug.trim()) {
			onUpdate({ name: editName, slug: editSlug });
		} else if (!editSlug.trim()) {
			// Reset to original if empty
			setEditSlug(release.slug);
		}
	};

	const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.currentTarget.blur();
		}
	};

	const handleSlugKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.currentTarget.blur();
		}
	};

	return (
		<div className="flex flex-col gap-3">
			{/* Title Input */}
			<Input
				value={editName}
				onChange={(e) => setEditName(e.target.value)}
				onBlur={handleNameBlur}
				onKeyDown={handleNameKeyDown}
				className="text-2xl font-semibold border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto py-1"
				placeholder="Release name"
			/>

			{/* Slug Input */}
			<Input
				value={editSlug}
				onChange={(e) => setEditSlug(e.target.value)}
				onBlur={handleSlugBlur}
				onKeyDown={handleSlugKeyDown}
				className="text-sm text-muted-foreground border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto py-1"
				placeholder="release-slug"
			/>

			{/* Actions Row */}
			<div className="flex items-center gap-2 flex-wrap">
				{/* Status Dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Badge
							className={cn(
								"border rounded-lg cursor-pointer gap-1.5",
								releaseStatusConfig[release.status].badgeClassName
							)}
						>
							{releaseStatusConfig[release.status].icon("w-3 h-3")}
							{releaseStatusConfig[release.status].label}
						</Badge>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						{RELEASE_STATUS_ORDER.map((status) => {
							const config = releaseStatusConfig[status];
							return (
								<DropdownMenuItem
									key={status}
									onClick={() => onStatusUpdate(status)}
									className="cursor-pointer"
								>
									<div className="flex items-center gap-2">
										{config.icon("w-4 h-4")}
										<span>{config.label}</span>
									</div>
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Target Date */}
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className={cn(
								"h-6 gap-1.5 text-xs",
								release.targetDate ? "text-foreground" : "text-muted-foreground"
							)}
						>
							<IconCalendarEvent className="w-3 h-3" />
							{release.targetDate ? formatDate(release.targetDate) : "Set target date"}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={release.targetDate ? new Date(release.targetDate) : undefined}
							onSelect={(date) => onTargetDateUpdate(date || null)}
						/>
						{release.targetDate && (
							<div className="p-2 border-t">
								<Button size="sm" variant="ghost" className="w-full" onClick={() => onTargetDateUpdate(null)}>
									<IconX className="w-3 h-3 mr-1" />
									Clear date
								</Button>
							</div>
						)}
					</PopoverContent>
				</Popover>

				{/* Released Date */}
				{release.releasedAt && (
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="ghost" size="sm" className="h-6 gap-1.5 text-xs text-green-600">
								<IconCheck className="w-3 h-3" />
								Released: {formatDate(release.releasedAt)}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={release.releasedAt ? new Date(release.releasedAt) : undefined}
								onSelect={(date) => onReleasedAtUpdate(date || null)}
							/>
							<div className="p-2 border-t">
								<Button size="sm" variant="ghost" className="w-full" onClick={() => onReleasedAtUpdate(null)}>
									<IconX className="w-3 h-3 mr-1" />
									Clear date
								</Button>
							</div>
						</PopoverContent>
					</Popover>
				)}
			</div>
		</div>
	);
}
