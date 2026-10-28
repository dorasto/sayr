import SayrIcon from "@repo/ui/components/brand-icon";
import {
	IconArrowRight,
	IconArrowUpRight,
	IconCheck,
	IconChevronDown,
	IconCircleHalf2,
	IconMinus,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Comparison, ComparisonCell, ComparisonVisual } from "@/data/comparisons";
import type { MarketingPage } from "@/data/marketing-pages";
import { cn } from "@/lib/utils";
import { AiPanel } from "../landing/app-ui/ai-panel";
import { CLI_STEPS, CliPanel, GITHUB_STEPS, GithubPanel } from "../landing/app-ui/integration-panels";
import { type ReplayProps, useReplay } from "../landing/app-ui/replay";
import { SelfHostPanel } from "../landing/app-ui/self-host-panel";
import { VISIBILITY_STEPS, VisibilityPanel } from "../landing/app-ui/team-panels";
import { LoopDemo } from "../landing/hero/loop-demo";

const START_HREF = "https://admin.sayr.io";

/** Each reason's live recreation. Replays run their script; the rest manage themselves. */
const VISUALS: Record<
	ComparisonVisual,
	{ replay?: { Visual: (props: ReplayProps) => ReactNode; steps: number }; static?: ReactNode }
> = {
	github: { replay: { Visual: GithubPanel, steps: GITHUB_STEPS } },
	visibility: { replay: { Visual: VisibilityPanel, steps: VISIBILITY_STEPS } },
	ai: { static: <AiPanel active={false} /> },
	"self-host": { static: <SelfHostPanel /> },
};

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
	return (
		<div className="mx-auto max-w-2xl text-center">
			<p className="font-medium text-primary text-sm">{eyebrow}</p>
			<h2 className="mt-3 font-semibold text-3xl! tracking-tight md:text-4xl!">{title}</h2>
			{children && <p className="mt-4 text-muted-foreground">{children}</p>}
		</div>
	);
}

/** Sayr's mark and the competitor's initial, side by side. No third-party logos. */
function VersusMark({ competitor }: { competitor: string }) {
	return (
		<div className="flex items-center justify-center gap-3" aria-hidden>
			<span className="flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-lg shadow-primary/10">
				<SayrIcon className="size-7" />
			</span>
			<span className="font-medium text-muted-foreground text-xs uppercase tracking-widest">vs</span>
			<span className="flex size-14 items-center justify-center rounded-2xl border bg-muted/40 font-semibold text-2xl text-muted-foreground">
				{competitor[0]}
			</span>
		</div>
	);
}

function Hero({ data, page, updated }: { data: Comparison; page: MarketingPage; updated: string }) {
	return (
		<section className="px-6 pt-10 pb-20">
			<div className="mx-auto max-w-3xl text-center">
				<nav
					aria-label="Breadcrumb"
					className="mb-8 flex items-center justify-center gap-2 text-muted-foreground text-xs"
				>
					<a href="/" className="hover:text-foreground">
						Home
					</a>
					<span aria-hidden>/</span>
					<a href={`/${page.section}`} className="hover:text-foreground">
						Comparisons
					</a>
					<span aria-hidden>/</span>
					<span className="text-foreground">{page.heading}</span>
				</nav>
				<VersusMark competitor={data.competitor.name} />
				<p className="mt-6 font-medium text-primary text-sm">{data.hero.eyebrow}</p>
				<h1 className="mt-3 font-semibold text-4xl! leading-[1.08]! tracking-[-0.035em] md:text-[3.25rem]!">
					{data.hero.title}
				</h1>
				<p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">{data.hero.lead}</p>
				<div className="mt-7 flex flex-wrap items-center justify-center gap-3">
					<Button
						size="lg"
						className="rounded-full px-6"
						render={
							<a href={START_HREF}>
								Start free <IconArrowUpRight className="size-4" />
							</a>
						}
					/>
					<Button
						size="lg"
						variant="outline"
						className="rounded-full px-6"
						render={<a href="#feature-comparison">Jump to the comparison</a>}
					/>
				</div>
				<p className="mt-5 text-muted-foreground text-xs">
					Updated <time dateTime={page.updated}>{updated}</time>
				</p>
			</div>

			<div className="mx-auto mt-12 max-w-6xl">
				<LoopDemo />
			</div>
		</section>
	);
}

function AtAGlance({ data }: { data: Comparison }) {
	const cards = [
		{ ...data.competitor, sayr: false },
		{ name: "Sayr", ...data.sayr, sayr: true },
	];
	return (
		<section className="px-6 py-24">
			<div className="mx-auto max-w-5xl">
				<SectionHeading eyebrow="At a glance" title="Two different ideas of where feedback lives" />
				<div className="mt-14 grid gap-4 md:grid-cols-2">
					{cards.map((card) => (
						<div
							key={card.name}
							className={cn(
								"flex flex-col rounded-2xl border p-7",
								card.sayr ? "border-primary/30 bg-card shadow-lg shadow-primary/5" : "bg-card/40"
							)}
						>
							<div className="flex items-center gap-3">
								{card.sayr ? (
									<span className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
										<SayrIcon className="size-5" />
									</span>
								) : (
									<span className="flex size-9 items-center justify-center rounded-xl bg-muted font-semibold text-muted-foreground">
										{card.name[0]}
									</span>
								)}
								<h3 className="font-semibold text-xl!">{card.name}</h3>
							</div>
							<p className={cn("mt-4 text-lg leading-snug", !card.sayr && "text-muted-foreground")}>
								{card.tagline}
							</p>
							<ul className="mt-6 flex flex-col gap-3">
								{card.points.map((point) => (
									<li key={point} className="flex gap-2.5 text-muted-foreground text-sm">
										<IconCheck
											className={cn(
												"mt-0.5 size-4 shrink-0",
												card.sayr ? "text-primary" : "text-muted-foreground/60"
											)}
										/>
										{point}
									</li>
								))}
							</ul>
							<div className="mt-auto pt-6">
								<div className="border-t pt-5">
									<p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
										Best for
									</p>
									<p className="mt-1.5 text-sm leading-snug">{card.bestFor}</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function ReasonRow({ item, index }: { item: Comparison["reasons"]["items"][number]; index: number }) {
	const visual = VISUALS[item.visual];
	const { at, ref, triggers } = useReplay<HTMLDivElement>(visual.replay?.steps ?? 0);
	return (
		<div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
			<div className={cn("flex flex-col gap-4", index % 2 === 1 && "lg:order-2")}>
				<p className="flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
					<span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[11px] text-primary tabular-nums">
						{index + 1}
					</span>
					{item.label}
					{item.plan && (
						<span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary normal-case tracking-normal">
							{item.plan}
						</span>
					)}
				</p>
				<h3 className="font-semibold text-2xl! tracking-tight md:text-3xl!">{item.title}</h3>
				<p className="text-muted-foreground leading-relaxed">{item.text}</p>
			</div>
			<div ref={ref} {...triggers} className="min-w-0 rounded-2xl border bg-card/40 p-4 sm:p-6">
				{visual.replay ? <visual.replay.Visual at={at} /> : visual.static}
			</div>
		</div>
	);
}

function Reasons({ data }: { data: Comparison }) {
	return (
		<section className="px-6 py-24">
			<div className="mx-auto max-w-6xl">
				<SectionHeading eyebrow={`Why switch from ${data.competitor.name}`} title={data.reasons.title}>
					{data.reasons.intro}
				</SectionHeading>
				<div className="mt-20 flex flex-col gap-24">
					{data.reasons.items.map((item, index) => (
						<ReasonRow key={item.title} item={item} index={index} />
					))}
				</div>
			</div>
		</section>
	);
}

function Pricing({ data }: { data: Comparison }) {
	const cards = [
		{ name: data.competitor.name, ...data.pricing.competitor, sayr: false },
		{ name: "Sayr", ...data.pricing.sayr, sayr: true },
	];
	return (
		<section className="px-6 py-24">
			<div className="mx-auto max-w-5xl">
				<SectionHeading eyebrow="Pricing" title="Pay for your team, not your community">
					The biggest difference isn't the price tag, it's what you're charged for.
				</SectionHeading>
				<div className="mt-14 grid gap-4 md:grid-cols-2">
					{cards.map((card) => (
						<div
							key={card.name}
							className={cn(
								"flex flex-col rounded-2xl border p-7",
								card.sayr ? "border-primary/30 bg-card shadow-lg shadow-primary/5" : "bg-card/40"
							)}
						>
							<p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">{card.name}</p>
							<h3 className={cn("mt-2 font-semibold text-2xl! tracking-tight", card.sayr && "text-primary")}>
								{card.model}
							</h3>
							<p className="mt-3 text-muted-foreground text-sm leading-relaxed">{card.summary}</p>
							<dl className="mt-6 divide-y rounded-xl border bg-background/40">
								{card.plans.map((plan) => (
									<div key={plan.name} className="flex items-baseline justify-between gap-4 px-4 py-3">
										<dt className="text-sm">
											<span className="font-medium">{plan.name}</span>
											<span className="block text-muted-foreground text-xs">{plan.detail}</span>
										</dt>
										<dd className="shrink-0 font-semibold text-sm tabular-nums">{plan.price}</dd>
									</div>
								))}
							</dl>
						</div>
					))}
				</div>
				<p className="mt-6 text-center text-muted-foreground text-xs">
					{data.competitor.name} prices as of {data.pricing.checked}, from{" "}
					<a href={data.pricing.sourceUrl} className="underline hover:text-foreground" rel="nofollow noopener">
						their pricing page
					</a>
					. See{" "}
					<a href="/pricing" className="underline hover:text-foreground">
						Sayr's pricing
					</a>{" "}
					for every plan.
				</p>
			</div>
		</section>
	);
}

function Cell({ value, sayr }: { value: ComparisonCell; sayr?: boolean }) {
	if (value === true)
		return (
			<span
				className={cn(
					"mx-auto flex size-6 items-center justify-center rounded-full",
					sayr ? "bg-primary/15 text-primary" : "bg-muted text-foreground"
				)}
			>
				<IconCheck aria-label="Yes" className="size-3.5" stroke={3} />
			</span>
		);
	if (value === false) return <IconMinus aria-label="No" className="mx-auto size-4 text-muted-foreground/40" />;
	if (value === "partial")
		return (
			<span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
				<IconCircleHalf2 className="size-3.5" /> Partial
			</span>
		);
	return <span className={cn("font-medium text-xs", sayr ? "text-primary" : "text-muted-foreground")}>{value}</span>;
}

/** A real <table> with one <tbody> per group, so crawlers and screen readers get the structure. */
function FeatureTable({ data }: { data: Comparison }) {
	return (
		<section id="feature-comparison" className="scroll-mt-24 px-6 py-24">
			<div className="mx-auto max-w-4xl">
				<SectionHeading eyebrow="Feature by feature" title={`Sayr and ${data.competitor.name}, side by side`} />
				<div className="mt-14 overflow-x-auto rounded-2xl border bg-card/40">
					<table className="w-full min-w-[34rem] text-sm">
						<thead>
							<tr className="border-b">
								<th scope="col" className="p-4 text-left font-medium text-muted-foreground">
									<span className="sr-only">Feature</span>
								</th>
								<th scope="col" className="w-32 bg-primary/[0.06] p-4 font-semibold text-primary">
									<span className="flex items-center justify-center gap-2">
										<SayrIcon className="size-4" /> Sayr
									</span>
								</th>
								<th scope="col" className="w-32 p-4 font-medium text-muted-foreground">
									{data.competitor.name}
								</th>
							</tr>
						</thead>
						{data.table.map((group) => (
							<tbody key={group.group}>
								<tr>
									<th
										scope="colgroup"
										colSpan={3}
										className="border-b bg-muted/30 px-4 pt-6 pb-2 text-left font-semibold text-[11px] text-muted-foreground uppercase tracking-wider"
									>
										{group.group}
									</th>
								</tr>
								{group.rows.map((row) => (
									<tr key={row.feature} className="border-b last:border-b-0">
										<th scope="row" className="p-4 text-left font-normal">
											{row.feature}
											{row.note && (
												<span className="mt-1 block text-muted-foreground text-xs">{row.note}</span>
											)}
										</th>
										<td className="bg-primary/[0.06] p-4 text-center">
											<Cell value={row.sayr} sayr />
										</td>
										<td className="p-4 text-center">
											<Cell value={row.competitor} />
										</td>
									</tr>
								))}
							</tbody>
						))}
					</table>
				</div>
			</div>
		</section>
	);
}

function Fit({ data }: { data: Comparison }) {
	const columns = [
		{ title: `Choose ${data.competitor.name} if…`, items: data.fit.competitor, sayr: false },
		{ title: "Choose Sayr if…", items: data.fit.sayr, sayr: true },
	];
	return (
		<section className="px-6 py-24">
			<div className="mx-auto max-w-5xl">
				<SectionHeading eyebrow="The honest take" title="Which one is right for you?">
					{data.competitor.name} is a good product. Here's when we'd point you to it, and when Sayr fits better.
				</SectionHeading>
				<div className="mt-14 grid gap-4 md:grid-cols-2">
					{columns.map((column) => (
						<div
							key={column.title}
							className={cn("rounded-2xl border p-7", column.sayr ? "border-primary/30 bg-card" : "bg-card/40")}
						>
							<h3 className="font-semibold text-lg!">{column.title}</h3>
							<ul className="mt-5 flex flex-col gap-4">
								{column.items.map((item) => (
									<li key={item} className="flex gap-3 text-muted-foreground text-sm leading-relaxed">
										<IconArrowRight
											className={cn(
												"mt-0.5 size-4 shrink-0",
												column.sayr ? "text-primary" : "text-muted-foreground/60"
											)}
										/>
										{item}
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function Switching({ data }: { data: Comparison }) {
	const { at, ref, triggers } = useReplay<HTMLDivElement>(CLI_STEPS);
	return (
		<section className="px-6 py-24">
			<div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
				<div>
					<p className="font-medium text-primary text-sm">Switching</p>
					<h2 className="mt-3 font-semibold text-3xl! tracking-tight md:text-4xl!">{data.switching.title}</h2>
					<p className="mt-4 text-muted-foreground">{data.switching.text}</p>
					<ol className="mt-8 flex flex-col gap-5">
						{data.switching.steps.map((step, index) => (
							<li key={step.title} className="flex gap-4">
								<span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card font-semibold text-sm tabular-nums">
									{index + 1}
								</span>
								<div>
									<p className="font-medium">{step.title}</p>
									<p className="mt-0.5 text-muted-foreground text-sm">{step.text}</p>
								</div>
							</li>
						))}
					</ol>
					<p className="mt-8 text-muted-foreground text-sm">
						Would an importer help?{" "}
						<a href="https://platform.sayr.io" className="text-primary hover:underline">
							Tell us on our public board
						</a>
						.
					</p>
				</div>
				<div ref={ref} {...triggers} className="min-w-0">
					<CliPanel at={at} />
				</div>
			</div>
		</section>
	);
}

function Faq({ data }: { data: Comparison }) {
	return (
		<section className="px-6 py-24">
			<div className="mx-auto max-w-(--breakpoint-md)">
				<SectionHeading eyebrow="FAQ" title={`Sayr vs ${data.competitor.name}: common questions`} />
				<div className="mt-14 space-y-2">
					{data.faqs.map((faq) => (
						<details key={faq.q} className="group overflow-hidden rounded-xl border bg-card">
							<summary className="flex cursor-pointer list-none items-center justify-between p-5 text-left [&::-webkit-details-marker]:hidden">
								<span className="font-medium text-sm">{faq.q}</span>
								<IconChevronDown className="ml-4 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
							</summary>
							<p className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
						</details>
					))}
				</div>
			</div>
		</section>
	);
}

function FinalCta({ data, related }: { data: Comparison; related: MarketingPage[] }) {
	return (
		<section className="relative overflow-hidden px-6 py-24">
			<div className="absolute inset-0">
				<div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[100px]" />
			</div>
			<div className="relative z-10 mx-auto max-w-(--breakpoint-md) text-center">
				<VersusMark competitor={data.competitor.name} />
				<h2 className="mt-8 font-semibold text-4xl! tracking-tight md:text-5xl!">
					One tool instead of {data.competitor.name} plus a tracker
				</h2>
				<p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
					Free for up to 5 members, with unlimited voters on your public board. Or self-host it for free.
				</p>
				<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
					<Button
						size="lg"
						className="rounded-full px-6 shadow-lg shadow-primary/20"
						render={
							<a href={START_HREF}>
								Start free <IconArrowUpRight className="size-4" />
							</a>
						}
					/>
					<Button
						size="lg"
						variant="outline"
						className="rounded-full px-6"
						render={<a href="https://platform.sayr.io">See our live board</a>}
					/>
				</div>
				{related.length > 0 && (
					<nav aria-label="Related comparisons" className="mt-16 text-sm">
						<p className="mb-3 text-muted-foreground">More comparisons</p>
						<div className="flex flex-wrap justify-center gap-2">
							{related.map((item) => (
								<a
									key={`${item.section}/${item.slug}`}
									href={`/${item.section}/${item.slug}`}
									className="rounded-full border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary"
								>
									{item.heading}
								</a>
							))}
						</div>
					</nav>
				)}
			</div>
		</section>
	);
}

/**
 * The /compare/* template (SAY-93), modelled on the best competitor pages
 * (Featurebase, Plane): hero with the live loop demo, the two products at a
 * glance, reasons with live recreations, pricing by model, a grouped feature
 * table, an honest "which is right for you", switching steps, FAQ, CTA.
 */
export function ComparisonPage({
	data,
	page,
	updated,
	related,
}: {
	data: Comparison;
	page: MarketingPage;
	updated: string;
	related: MarketingPage[];
}) {
	return (
		<article>
			<Hero data={data} page={page} updated={updated} />
			<AtAGlance data={data} />
			<Reasons data={data} />
			<Pricing data={data} />
			<FeatureTable data={data} />
			<Fit data={data} />
			<Switching data={data} />
			<Faq data={data} />
			<FinalCta data={data} related={related} />
		</article>
	);
}
