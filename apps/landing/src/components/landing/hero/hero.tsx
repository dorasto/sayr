import { IconArrowUpRight, IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { LoopDemo } from "./loop-demo";

const REASSURANCE = ["Free for up to 5 members", "No credit card", "Pay for your team, never your users"];

/**
 * Homepage hero (SAY-93). Says what Sayr is in terms visitors already know,
 * then shows it: the loop demo follows one task from a public idea to a
 * shipped release, with the team's app and the public portal side by side.
 * Static markup only (no entrance animations), so the headline is visible in
 * the server-rendered HTML.
 */
export function Hero() {
	return (
		<section className="px-6 pt-10 pb-20">
			<div className="mx-auto max-w-3xl text-center">
				<a
					href="/docs/self-hosting/get-started"
					className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-muted-foreground text-xs hover:text-foreground"
				>
					EU cloud or self-hosted · Source-available
					<IconArrowUpRight className="size-3.5" />
				</a>
				<h1 className="mt-5 font-semibold text-4xl! leading-[1.08]! tracking-[-0.035em] md:text-[3.5rem]!">
					Your project tracker,
					<br />
					with a public side.
				</h1>
				<p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
					Sayr is where your team plans and ships work, and where your users post ideas, vote, and follow your
					roadmap and changelog. One tool instead of a tracker plus a feedback board.
				</p>
				<div className="mt-7 flex flex-wrap items-center justify-center gap-3">
					<Button
						size="lg"
						className="rounded-full px-6"
						render={
							<a href="https://admin.sayr.io">
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
				<ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-muted-foreground text-sm">
					{REASSURANCE.map((item) => (
						<li key={item} className="flex items-center gap-1.5">
							<IconCheck className="size-4 text-primary" />
							{item}
						</li>
					))}
				</ul>
			</div>

			<div className="mx-auto mt-10 max-w-6xl">
				<LoopDemo />
			</div>
		</section>
	);
}
