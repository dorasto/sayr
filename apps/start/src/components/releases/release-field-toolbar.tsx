import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Calendar } from "@repo/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { formatDate } from "@repo/util";
import { IconCalendarEvent, IconX } from "@tabler/icons-react";
import { useCallback } from "react";
import { useLayoutReleaseOptional } from "@/contexts/ContextOrgRelease";
import {
	getReleaseReleasedAtUpdatePayload,
	getReleaseStatusDisplay,
	getReleaseStatusOptions,
	getReleaseStatusUpdatePayload,
	getReleaseTargetDateUpdatePayload,
	useReleaseFieldAction,
} from "./actions";
import { releaseStatusConfig, type ReleaseStatusKey } from "./config";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxIcon,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxTrigger,
	ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";

type ReleaseFieldKey = "status" | "targetDate" | "releasedAt";

interface ReleaseFieldToolbarProps {
	release: schema.releaseType | schema.ReleaseWithTasks;
	/** "toolbar" = compact pill buttons (creator/header); "sidebar" = badge + date pickers */
	variant?: "toolbar" | "sidebar";
	/** Which fields to show. Defaults to all three. */
	fields?: ReleaseFieldKey[];
	/** Whether fields are interactive. */
	editable?: boolean;
	/**
	 * Per-field change callbacks for draft/creator mode.
	 * When provided alongside a draft release (id === "draft"), these are
	 * called instead of (the skipped) API calls so the parent can update
	 * local state.
	 */
	onChange?: {
		status?: (status: ReleaseStatusKey) => void;
		targetDate?: (date: Date | null) => void;
		releasedAt?: (date: Date | null) => void;
	};
	/**
	 * Fallback setter for contexts that live outside the LayoutReleaseProvider
	 * (e.g. the create dialog). When omitted the toolbar reads from the provider.
	 */
	onReleaseChange?: (updater: (prev: schema.ReleaseWithTasks | null) => schema.ReleaseWithTasks | null) => void;
}

const DEFAULT_FIELDS: ReleaseFieldKey[] = ["status", "targetDate", "releasedAt"];

/**
 * Self-contained toolbar/sidebar for editing release fields.
 * Mirrors `TaskFieldToolbar` — handles its own API calls internally.
 */
export function ReleaseFieldToolbar({
	release,
	variant = "toolbar",
	fields = DEFAULT_FIELDS,
	editable = true,
	onChange,
	onReleaseChange,
}: ReleaseFieldToolbarProps) {
	// Always call the safe hook (no conditional), then prefer prop override.
	const releaseCtx = useLayoutReleaseOptional();
	const setRelease: (updater: (prev: schema.ReleaseWithTasks | null) => schema.ReleaseWithTasks | null) => void =
		onReleaseChange ?? (releaseCtx?.setRelease as typeof setRelease) ?? (() => {});

	const { execute } = useReleaseFieldAction(release, setRelease);

	// ── Status ────────────────────────────────────────────────────────

	const handleStatusChange = useCallback(
		async (newStatus: string) => {
			if (!newStatus || newStatus === release.status) return;
			const key = newStatus as ReleaseStatusKey;

			// Call parent onChange for draft/local state (always, even for drafts)
			onChange?.status?.(key);

			const payload = getReleaseStatusUpdatePayload(release.releasedAt ?? null, key);
			await execute(payload);
		},
		[release.status, release.releasedAt, onChange, execute],
	);

	// ── Target date ───────────────────────────────────────────────────

	const handleTargetDateChange = useCallback(
		async (date: Date | null | undefined) => {
			const d = date ?? null;
			onChange?.targetDate?.(d);
			await execute(getReleaseTargetDateUpdatePayload(d));
		},
		[onChange, execute],
	);

	// ── Released at ───────────────────────────────────────────────────

	const handleReleasedAtChange = useCallback(
		async (date: Date | null | undefined) => {
			const d = date ?? null;
			onChange?.releasedAt?.(d);
			await execute(getReleaseReleasedAtUpdatePayload(d));
		},
		[onChange, execute],
	);

	// ── Render ────────────────────────────────────────────────────────

	const statusOptions = getReleaseStatusOptions();
	const currentStatus = release.status as ReleaseStatusKey;
	const statusDisplay = getReleaseStatusDisplay(currentStatus);

	const showField = (key: ReleaseFieldKey) => fields.includes(key);

	if (variant === "sidebar") {
		return (
			<div className="flex flex-col gap-3">
				{/* Status */}
				{showField("status") && (
					<div className="flex flex-col gap-1.5">
						{editable ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="primary"
										size="sm"
										className={cn(
											"border-transparent! rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit",
											releaseStatusConfig[currentStatus].badgeClassName,
										)}
									>
										{releaseStatusConfig[currentStatus].icon("w-3 h-3")}
										{releaseStatusConfig[currentStatus].label}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									{statusOptions.map((opt) => (
										<DropdownMenuItem
											key={opt.id}
											onClick={() => handleStatusChange(opt.id)}
											className="cursor-pointer"
										>
											<div className="flex items-center gap-2">
												{opt.icon}
												<span>{opt.label}</span>
											</div>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<span
								className={cn(
									"inline-flex items-center gap-1.5 text-xs px-1 py-0.5 rounded-lg w-fit",
									releaseStatusConfig[currentStatus].badgeClassName,
								)}
							>
								{releaseStatusConfig[currentStatus].icon("w-3 h-3")}
								{releaseStatusConfig[currentStatus].label}
							</span>
						)}
					</div>
				)}

				{/* Target Date */}
				{showField("targetDate") && (
					<div className="flex flex-col gap-1.5">
						{editable ? (
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="primary"
										size="sm"
										className={cn(
											"border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit",
											release.targetDate ? "text-foreground" : "text-muted-foreground",
										)}
									>
										<IconCalendarEvent className="w-3 h-3" />
										{release.targetDate ? formatDate(release.targetDate) : "No target date"}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<Calendar
										mode="single"
										selected={release.targetDate ? new Date(release.targetDate) : undefined}
										onSelect={(d) => handleTargetDateChange(d)}
									/>
									{release.targetDate && (
										<div className="p-2 border-t">
											<Button
												variant="primary"
												size="sm"
												className="border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit"
												onClick={() => handleTargetDateChange(null)}
											>
												<IconX className="w-3 h-3 mr-1" />
												Clear date
											</Button>
										</div>
									)}
								</PopoverContent>
							</Popover>
						) : (
							<span className={cn("text-xs", release.targetDate ? "text-foreground" : "text-muted-foreground")}>
								<IconCalendarEvent className="w-3 h-3 inline mr-1" />
								{release.targetDate ? formatDate(release.targetDate) : "No target date"}
							</span>
						)}
					</div>
				)}

				{/* Released At */}
				{showField("releasedAt") && (
					<div className="flex flex-col gap-1.5">
						{editable ? (
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="primary"
										size="sm"
										className={cn(
											"border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit",
											release.releasedAt ? "text-foreground" : "text-muted-foreground",
										)}
									>
										<IconCalendarEvent className="w-3 h-3" />
										{release.releasedAt ? formatDate(release.releasedAt) : "No release date"}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<Calendar
										mode="single"
										selected={release.releasedAt ? new Date(release.releasedAt) : undefined}
										onSelect={(d) => handleReleasedAtChange(d)}
									/>
									{release.releasedAt && (
										<div className="p-2 border-t">
											<Button
												variant="primary"
												size="sm"
												className="border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit"
												onClick={() => handleReleasedAtChange(null)}
											>
												<IconX className="w-3 h-3 mr-1" />
												Clear date
											</Button>
										</div>
									)}
								</PopoverContent>
							</Popover>
						) : (
							<span className={cn("text-xs", release.releasedAt ? "text-foreground" : "text-muted-foreground")}>
								<IconCalendarEvent className="w-3 h-3 inline mr-1" />
								{release.releasedAt ? formatDate(release.releasedAt) : "No release date"}
							</span>
						)}
					</div>
				)}
			</div>
		);
	}

	// ── Toolbar variant (creator / compact) ───────────────────────────
	return (
		<div className="flex items-center gap-2 flex-wrap">
			{showField("status") && (
				<ComboBox value={currentStatus} onValueChange={(v) => v && handleStatusChange(v)}>
					<ComboBoxTrigger className="w-fit text-xs h-7 border border-transparent hover:border-border bg-accent text-accent-foreground hover:bg-secondary rounded-lg px-2 flex items-center gap-2">
						<ComboBoxValue placeholder="Status">
							<div className="flex items-center gap-1.5">
								{statusDisplay.icon}
								<span>{statusDisplay.label}</span>
							</div>
						</ComboBoxValue>
						<ComboBoxIcon />
					</ComboBoxTrigger>
					<ComboBoxContent>
						<ComboBoxList>
							<ComboBoxEmpty>Not found</ComboBoxEmpty>
							<ComboBoxGroup>
								{statusOptions.map((opt) => (
									<ComboBoxItem key={opt.id} value={opt.id}>
										{opt.icon}
										<span className="ml-2">{opt.label}</span>
									</ComboBoxItem>
								))}
							</ComboBoxGroup>
						</ComboBoxList>
					</ComboBoxContent>
				</ComboBox>
			)}

			{showField("targetDate") && (
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="primary"
							size="sm"
							className={cn(
								"w-fit text-xs h-7 border border-transparent hover:border-border bg-accent text-accent-foreground hover:bg-secondary rounded-lg px-2",
								release.targetDate ? "" : "text-muted-foreground",
							)}
						>
							<IconCalendarEvent className="h-3.5 w-3.5" />
							{release.targetDate ? formatDate(release.targetDate) : "Target date"}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={release.targetDate ? new Date(release.targetDate) : undefined}
							onSelect={(d) => handleTargetDateChange(d)}
						/>
						{release.targetDate && (
							<div className="p-2 border-t">
								<Button
									variant="primary"
									size="sm"
									className="border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit"
									onClick={() => handleTargetDateChange(null)}
								>
									<IconX className="w-3 h-3 mr-1" />
									Clear date
								</Button>
							</div>
						)}
					</PopoverContent>
				</Popover>
			)}

			{showField("releasedAt") && (
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="primary"
							size="sm"
							className={cn(
								"w-fit text-xs h-7 border border-transparent hover:border-border bg-accent text-accent-foreground hover:bg-secondary rounded-lg px-2",
								release.releasedAt ? "" : "text-muted-foreground",
							)}
						>
							<IconCalendarEvent className="h-3.5 w-3.5" />
							{release.releasedAt ? formatDate(release.releasedAt) : "Release date"}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={release.releasedAt ? new Date(release.releasedAt) : undefined}
							onSelect={(d) => handleReleasedAtChange(d)}
						/>
						{release.releasedAt && (
							<div className="p-2 border-t">
								<Button
									variant="primary"
									size="sm"
									className="border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit"
									onClick={() => handleReleasedAtChange(null)}
								>
									<IconX className="w-3 h-3 mr-1" />
									Clear date
								</Button>
							</div>
						)}
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
}
