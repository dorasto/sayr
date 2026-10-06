import { IconArrowRight, type IconBrandGithub } from "@tabler/icons-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { type ReplayProps, useReplay } from "../app-ui/replay";

export interface ReplayCardItem {
	/** The small uppercase label, e.g. "GitHub". */
	name: string;
	icon: typeof IconBrandGithub;
	title: string;
	text: string;
	link: { href: string; label: string };
	/** The live recreation, and how many steps its replay has. */
	Visual: ComponentType<ReplayProps>;
	steps: number;
	/** Wide cards span two columns on large screens. */
	wide?: boolean;
	/** A plan note shown next to the label, e.g. "Pro". */
	plan?: string;
}

/**
 * A homepage feature card: label, heading, sentence, recreation, link. The
 * recreation plays its script when the card first scrolls into view, and again
 * whenever it's hovered or focused.
 */
export function ReplayCard({ item }: { item: ReplayCardItem }) {
	const { at, ref, triggers } = useReplay(item.steps);
	return (
		<article
			ref={ref}
			{...triggers}
			className={cn(
				"group flex flex-col gap-5 rounded-2xl border bg-card/40 p-5 transition-colors duration-300 hover:border-primary/40 hover:bg-card/70",
				item.wide && "lg:col-span-2"
			)}
		>
			<div className="flex flex-col gap-2">
				<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider transition-colors group-hover:text-primary">
					<item.icon className="size-4" />
					{item.name}
					{item.plan && (
						<span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary normal-case tracking-normal">
							{item.plan}
						</span>
					)}
				</p>
				<h3 className="font-semibold text-lg! tracking-tight">{item.title}</h3>
				<p className="text-muted-foreground text-sm">{item.text}</p>
			</div>
			{/* Wide cards are shorter than their row partner, so centre the visual rather than leave a gap. */}
			<div className={cn("min-w-0", item.wide ? "flex flex-1 flex-col justify-center" : "mt-auto")}>
				<item.Visual at={at} />
			</div>
			<a href={item.link.href} className="flex w-fit items-center gap-1 text-primary text-sm hover:underline">
				{item.link.label} <IconArrowRight className="size-4" />
			</a>
		</article>
	);
}
