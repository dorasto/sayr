import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Calendar } from "@repo/ui/components/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@repo/ui/components/tooltip";
import {
	IconBrain,
	IconCalendar,
	IconCoin,
	IconLetterA,
	IconAlertTriangle,
	IconExternalLink,
	IconBan,
	IconClock,
	IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { OrganizationSettings, OrgAiSettings } from "@repo/database";
import {
	getConsoleOrgAiUsage,
	updateConsoleOrgAiSettings,
	type ConsoleAiUsageRow,
	type ConsoleAiMonthlySummary,
} from "@/lib/fetches/console";

type Props = {
	orgId: string;
	settings: OrganizationSettings | null;
};

type DaysOption = 7 | 30 | 90;

const DAYS_OPTIONS: { value: DaysOption; label: string }[] = [
	{ value: 7, label: "Last 7 days" },
	{ value: 30, label: "Last 30 days" },
	{ value: 90, label: "Last 90 days" },
];


/**
 * EUR per-token pricing for Mistral models.
 * Source: https://mistral.ai/pricing (EUR tab, as of 2026-03)
 * mistral-small-latest / mistral-small-26xx: €0.10/M input, €0.30/M output
 * mistral-medium-latest / mistral-medium-26xx: €0.40/M input, €2.00/M output
 * mistral-large-latest / mistral-large-26xx: €2.00/M input, €6.00/M output
 */
const MISTRAL_EUR_PRICING: Record<string, { inputEurPerToken: number; outputEurPerToken: number }> = {
	"mistral-small-latest": { inputEurPerToken: 0.10 / 1_000_000, outputEurPerToken: 0.30 / 1_000_000 },
	"mistral-medium-latest": { inputEurPerToken: 0.40 / 1_000_000, outputEurPerToken: 2.00 / 1_000_000 },
	"mistral-large-latest": { inputEurPerToken: 2.00 / 1_000_000, outputEurPerToken: 6.00 / 1_000_000 },
};

/** Returns pricing for a model, matching on prefix so versioned aliases (mistral-small-2603) also resolve. */
function getEurPricing(model: string) {
	// Exact match first
	if (MISTRAL_EUR_PRICING[model]) return MISTRAL_EUR_PRICING[model];
	// Prefix match for versioned aliases e.g. "mistral-small-2603" → "mistral-small-latest"
	for (const [key, pricing] of Object.entries(MISTRAL_EUR_PRICING)) {
		const prefix = key.replace("-latest", "-");
		if (model.startsWith(prefix)) return pricing;
	}
	return null;
}

function computeEurCost(row: ConsoleAiUsageRow): number | null {
	const pricing = getEurPricing(row.model);
	if (!pricing) return null;
	return Number(row.input_tokens) * pricing.inputEurPerToken +
		Number(row.output_tokens) * pricing.outputEurPerToken;
}

function formatEur(eur: number): string {
	return `€${eur.toFixed(5)}`;
}

function formatTokenCount(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

// ──────────────────────────────────────────────
// AI Controls card
// ──────────────────────────────────────────────

const PRESET_DURATIONS: { label: string; days: number }[] = [
	{ label: "1 day", days: 1 },
	{ label: "1 week", days: 7 },
	{ label: "1 month", days: 30 },
];

function addDays(date: Date, days: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

function AiControlsCard({
	orgId,
	initialAi,
	onSettingsChange,
}: {
	orgId: string;
	initialAi: OrgAiSettings;
	onSettingsChange: (updated: OrgAiSettings) => void;
}) {
	const [ai, setAi] = useState<OrgAiSettings>(initialAi);
	const [saving, setSaving] = useState(false);
	const [rateLimitOpen, setRateLimitOpen] = useState(false);
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
	const [rateLimitReason, setRateLimitReason] = useState("");

	// Derive whether the rate limit is currently active
	const rateLimitActive = !!ai.rateLimited && new Date(ai.rateLimited.until) > new Date();
	const rateLimitUntil = ai.rateLimited ? new Date(ai.rateLimited.until) : null;

	async function applyPatch(patch: Parameters<typeof updateConsoleOrgAiSettings>[1]) {
		setSaving(true);
		const result = await updateConsoleOrgAiSettings(orgId, patch);
		setSaving(false);
		if (result.success && result.data) {
			setAi(result.data.ai);
			onSettingsChange(result.data.ai);
		}
	}

	async function handleDisableToggle() {
		await applyPatch({ disabled: !ai.disabled });
	}

	async function handleApplyRateLimit() {
		if (!selectedDate) return;
		await applyPatch({
			rateLimited: {
				until: selectedDate.toISOString(),
				reason: rateLimitReason.trim() || undefined,
			},
		});
		setRateLimitOpen(false);
		setSelectedDate(undefined);
		setRateLimitReason("");
	}

	async function handleRemoveRateLimit() {
		await applyPatch({ rateLimited: null });
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div>
						<CardTitle className="text-sm flex items-center gap-1.5">
							<IconBrain className="size-3.5" />
							AI Controls
						</CardTitle>
						<CardDescription className="text-xs mt-0.5">
							Manage AI feature access for this organization.
						</CardDescription>
					</div>
					{/* Status badge */}
					{ai.disabled ? (
						<Badge variant="destructive" className="gap-1 text-xs">
							<IconBan className="size-3" />
							Disabled
						</Badge>
					) : rateLimitActive ? (
						<Badge variant="outline" className="gap-1 text-xs border-yellow-500 text-yellow-600">
							<IconClock className="size-3" />
							Rate Limited
						</Badge>
					) : (
						<Badge variant="secondary" className="gap-1 text-xs">
							Active
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Rate limit info when active */}
				{rateLimitActive && rateLimitUntil && (
					<div className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/30 rounded-md px-3 py-2">
						<span className="font-medium text-yellow-600">Rate limited</span> until{" "}
						<span className="font-mono">{rateLimitUntil.toLocaleString()}</span>
						{ai.rateLimited?.reason && (
							<span className="block mt-0.5 text-muted-foreground">Reason: {ai.rateLimited.reason}</span>
						)}
					</div>
				)}

				<div className="flex flex-wrap gap-2">
					{/* Disable / Enable toggle */}
					<Button
						variant={ai.disabled ? "default" : "outline"}
						size="sm"
						className="h-8 text-xs gap-1.5"
						onClick={handleDisableToggle}
						disabled={saving}
					>
						<IconBan className="size-3.5" />
						{ai.disabled ? "Re-enable AI" : "Disable AI"}
					</Button>

					{/* Remove rate limit */}
					{rateLimitActive && (
						<Button
							variant="outline"
							size="sm"
							className="h-8 text-xs gap-1.5"
							onClick={handleRemoveRateLimit}
							disabled={saving}
						>
							<IconX className="size-3.5" />
							Remove Rate Limit
						</Button>
					)}

					{/* Apply rate limit popover */}
					{!ai.disabled && (
						<Popover open={rateLimitOpen} onOpenChange={setRateLimitOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="h-8 text-xs gap-1.5"
									disabled={saving}
								>
									<IconClock className="size-3.5" />
									{rateLimitActive ? "Extend Rate Limit" : "Rate Limit"}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<div className="p-3 border-b space-y-3">
									<p className="text-xs font-medium">Set rate limit expiry</p>
									{/* Quick presets */}
									<div className="flex flex-wrap gap-1.5">
										{PRESET_DURATIONS.map((preset) => (
											<Button
												key={preset.days}
												variant="outline"
												size="sm"
												className="h-7 text-xs"
												onClick={() => setSelectedDate(addDays(new Date(), preset.days))}
											>
												{preset.label}
											</Button>
										))}
									</div>
									{/* Reason input */}
									<div className="space-y-1">
										<Label className="text-xs">Reason (optional)</Label>
										<Input
											className="h-8 text-xs"
											placeholder="e.g. Excessive usage"
											value={rateLimitReason}
											onChange={(e) => setRateLimitReason(e.target.value)}
										/>
									</div>
									{selectedDate && (
										<p className="text-xs text-muted-foreground">
											Expires: <span className="font-mono">{selectedDate.toLocaleString()}</span>
										</p>
									)}
								</div>
								<Calendar
									mode="single"
									selected={selectedDate}
									onSelect={setSelectedDate}
									disabled={(date) => date < new Date()}
									initialFocus
								/>
								<div className="p-3 border-t flex justify-end gap-2">
									<Button
										variant="outline"
										size="sm"
										className="h-8 text-xs"
										onClick={() => setRateLimitOpen(false)}
									>
										Cancel
									</Button>
									<Button
										size="sm"
										className="h-8 text-xs"
										onClick={handleApplyRateLimit}
										disabled={!selectedDate || saving}
									>
										Apply
									</Button>
								</div>
							</PopoverContent>
						</Popover>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export default function OrgAiUsage({ orgId, settings }: Props) {
	const [days, setDays] = useState<DaysOption>(30);
	const [rows, setRows] = useState<ConsoleAiUsageRow[]>([]);
	const [monthlySummary, setMonthlySummary] = useState<ConsoleAiMonthlySummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Local AI settings state — starts from org settings, updated on save
	const [aiSettings, setAiSettings] = useState<OrgAiSettings>(() => {
		const ai = settings?.ai;
		return ai ?? { disabled: false, rateLimited: null, taskSummary: true };
	});

	// Keep aiSettings in sync when settings change from the parent (settings prop is per-org).
	useEffect(() => {
		setAiSettings(settings?.ai ?? { disabled: false, rateLimited: null, taskSummary: true });
	}, [settings]);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);

		getConsoleOrgAiUsage(orgId, days)
			.then((result) => {
				if (cancelled) return;
				if (!result.success || !result.data) {
					setError(result.error || "Failed to load AI usage data");
					setRows([]);
					setMonthlySummary([]);
				} else {
					setRows(result.data.rows);
					setMonthlySummary(result.data.monthlySummary);
				}
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setError((err instanceof Error ? err.message : null) || "Failed to load AI usage data");
				setRows([]);
				setMonthlySummary([]);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [orgId, days]);

	// Aggregate totals across the window
	const totalRequests = rows.length;
	const totalTokens = rows.reduce((sum, r) => sum + Number(r.total_tokens), 0);
	const totalEur = rows.reduce((sum, r) => sum + (computeEurCost(r) ?? Number(r.cost_cents) / 100), 0);
	const failedCount = rows.filter((r) => Number(r.success) === 0).length;

	return (
		<div className="space-y-4">
			{/* AI Controls */}
			<AiControlsCard
				key={orgId}
				orgId={orgId}
				initialAi={aiSettings}
				onSettingsChange={setAiSettings}
			/>

			{/* Header row: title + days selector */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-sm font-medium">
					<IconBrain className="size-4 text-muted-foreground" />
					AI Usage
				</div>
				<Select
					value={String(days)}
					onValueChange={(v) => setDays(Number(v) as DaysOption)}
				>
					<SelectTrigger className="w-36 h-8 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{DAYS_OPTIONS.map((o) => (
							<SelectItem key={o.value} value={String(o.value)} className="text-xs">
								{o.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{loading && (
				<div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
					Loading AI usage data…
				</div>
			)}

			{!loading && error && (
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center gap-2 text-sm text-muted-foreground justify-center py-4">
							<IconAlertTriangle className="size-4" />
							{error === "AI usage data is not available on this edition"
								? "ClickHouse is not configured on this instance."
								: error}
						</div>
					</CardContent>
				</Card>
			)}

			{!loading && !error && (
				<>
					{/* Summary cards */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<SummaryCard
							icon={<IconBrain className="size-4" />}
							label="Total Requests"
							value={String(totalRequests)}
						/>
						<SummaryCard
							icon={<IconLetterA className="size-4" />}
							label="Total Tokens"
							value={formatTokenCount(totalTokens)}
						/>
					<SummaryCard
						icon={<IconCoin className="size-4" />}
						label="Total Cost"
						value={formatEur(totalEur)}
					/>
						<SummaryCard
							icon={<IconAlertTriangle className="size-4" />}
							label="Failed"
							value={String(failedCount)}
							variant={failedCount > 0 ? "destructive" : "default"}
						/>
					</div>

					{/* Monthly summary */}
					{monthlySummary.length > 0 && (
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-sm flex items-center gap-1.5">
									<IconCalendar className="size-3.5" />
									Monthly Breakdown
								</CardTitle>
								<CardDescription className="text-xs">
									Aggregated by calendar month within the selected window
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="overflow-auto rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Month</TableHead>
												<TableHead className="text-right">Requests</TableHead>
												<TableHead className="text-right">Total Tokens</TableHead>
												<TableHead className="text-right">Cost (EUR)</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{monthlySummary.map((row) => (
												<TableRow key={row.month}>
													<TableCell className="font-mono text-sm">{row.month}</TableCell>
													<TableCell className="text-right text-sm">{Number(row.requests).toLocaleString()}</TableCell>
													<TableCell className="text-right text-sm">{formatTokenCount(Number(row.total_tokens))}</TableCell>
													<TableCell className="text-right text-sm font-mono">
													{formatEur(Number(row.cost_cents) / 100)}
												</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Per-request table */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm flex items-center gap-1.5">
								<IconBrain className="size-3.5" />
								Requests
							</CardTitle>
							<CardDescription className="text-xs">
								{rows.length === 0
									? "No AI requests in this period"
									: `${rows.length} request${rows.length !== 1 ? "s" : ""}${rows.length === 500 ? " (capped at 500)" : ""}`}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{rows.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-6">
									No AI requests found for this organization in the selected time window.
								</p>
							) : (
								<div className="overflow-auto rounded-md border">
									<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[160px]">Timestamp</TableHead>
											<TableHead className="w-[180px]">Event</TableHead>
											<TableHead className="w-[160px]">Model</TableHead>
											<TableHead className="text-right w-[90px]">In tokens</TableHead>
											<TableHead className="text-right w-[90px]">Out tokens</TableHead>
											<TableHead className="text-right w-[90px]">Total</TableHead>
											<TableHead className="text-right w-[90px]">Cost (EUR)</TableHead>
											<TableHead className="w-[80px]">Status</TableHead>
											<TableHead>Actor</TableHead>
											<TableHead>Task</TableHead>
										</TableRow>
									</TableHeader>
										<TableBody>
											{rows.map((row, i) => (
												// eslint-disable-next-line react/no-array-index-key
										<TableRow key={`${row.event_time}-${i}`}>
											<TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
								<span>{new Date(`${row.event_time} UTC`).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</span>
							</TooltipTrigger>
							<TooltipContent>{new Date(`${row.event_time} UTC`).toLocaleString()}</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											</TableCell>
												<TableCell>
													<Badge variant="outline" className="text-xs font-mono whitespace-nowrap">
														{row.event_type}
													</Badge>
												</TableCell>
												<TableCell className="text-xs font-mono">{row.model || "—"}</TableCell>
													<TableCell className="text-right text-xs">{Number(row.input_tokens).toLocaleString()}</TableCell>
													<TableCell className="text-right text-xs">{Number(row.output_tokens).toLocaleString()}</TableCell>
													<TableCell className="text-right text-xs font-medium">{formatTokenCount(Number(row.total_tokens))}</TableCell>
													<TableCell className="text-right text-xs font-mono">
													{formatEur(computeEurCost(row) ?? Number(row.cost_cents) / 100)}
												</TableCell>
													<TableCell>
														{Number(row.success) === 1 ? (
															<Badge variant="secondary" className="text-xs">OK</Badge>
														) : (
															<Badge variant="destructive" className="text-xs">Failed</Badge>
														)}
													</TableCell>
												<TableCell>
													<div className="flex items-center gap-2">
														<Avatar className="size-5 rounded-full shrink-0">
															{row.actor_image && <AvatarImage src={row.actor_image} />}
															<AvatarFallback className="text-[10px]">
																{(row.actor_name ?? row.actor_id).slice(0, 2).toUpperCase()}
															</AvatarFallback>
														</Avatar>
														<span className="text-xs truncate max-w-[120px]" title={row.actor_id}>
															{row.actor_name ?? row.actor_id}
														</span>
													</div>
												</TableCell>
												<TableCell>
													{row.task_url ? (
														<a
															href={row.task_url}
															target="_blank"
															rel="noopener noreferrer"
															className="flex items-center gap-1 text-xs text-primary hover:underline max-w-[160px]"
															title={row.task_title ?? row.target_id}
														>
															<IconExternalLink className="size-3 shrink-0" />
															<span className="truncate">
																{row.task_title ? `#${row.task_short_id} ${row.task_title}` : `#${row.task_short_id}`}
															</span>
														</a>
													) : (
														<span className="text-xs font-mono text-muted-foreground truncate max-w-[120px] block" title={row.target_id}>
															{row.target_id || "—"}
														</span>
													)}
												</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}

// ──────────────────────────────────────────────
// Summary card
// ──────────────────────────────────────────────

function SummaryCard({
	icon,
	label,
	value,
	variant = "default",
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	variant?: "default" | "destructive";
}) {
	return (
		<div className="rounded-lg border p-3 space-y-1">
			<div className={`flex items-center gap-1.5 text-xs ${variant === "destructive" ? "text-destructive" : "text-muted-foreground"}`}>
				{icon}
				{label}
			</div>
			<div className={`text-xl font-semibold tabular-nums ${variant === "destructive" && value !== "0" ? "text-destructive" : ""}`}>
				{value}
			</div>
		</div>
	);
}
