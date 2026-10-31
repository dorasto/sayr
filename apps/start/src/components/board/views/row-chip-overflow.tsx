import { Badge } from "@repo/ui/components/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@repo/ui/components/hover-card";
import { cn } from "@repo/ui/lib/utils";
import { type ReactNode, useCallback, useLayoutEffect, useRef, useState } from "react";
import { countFittingChips } from "./row-chip-fit";

/** Matches the slot's `gap-1`. */
const CHIP_GAP_PX = 4;

export interface OverflowChip {
	id: string;
	/** The chip as shown in the row. Rendering nothing (e.g. no value) makes it count as absent. */
	node: ReactNode;
	/** How many field values this chip stands for — added to "+N" when it's hidden (1 per label). */
	valueCount: number;
	/** What the "+N" card shows for this chip when it's hidden. Defaults to `node`. */
	overflowNode?: ReactNode;
}

interface FitState {
	visibleCount: number;
	present: boolean[];
	moreWidth: number;
}

const sameFit = (a: FitState, b: FitState) =>
	a.visibleCount === b.visibleCount &&
	a.moreWidth === b.moreWidth &&
	a.present.length === b.present.length &&
	a.present.every((value, i) => value === b.present[i]);

/**
 * Measures a row's chip slot and decides how many chips fit. Every chip stays
 * mounted (hidden ones are taken out of flow, invisible and inert) so their
 * natural widths can always be read; one ResizeObserver watches the slot, the
 * chips and the "+N" pill, and runs before paint, so there's no visible flicker.
 * State only changes when the fit actually changes.
 */
function useChipFit(chipCount: number) {
	const slotRef = useRef<HTMLDivElement>(null);
	const chipRefs = useRef<(HTMLSpanElement | null)[]>([]);
	const moreRef = useRef<HTMLSpanElement>(null);
	const [fit, setFit] = useState<FitState>(() => ({
		visibleCount: chipCount,
		present: Array.from({ length: chipCount }, () => true),
		moreWidth: 0,
	}));

	const measure = useCallback(() => {
		const slot = slotRef.current;
		if (!slot) return;
		const widths = Array.from(
			{ length: chipCount },
			(_, i) => chipRefs.current[i]?.getBoundingClientRect().width ?? 0
		);
		const moreWidth = moreRef.current?.getBoundingClientRect().width ?? 0;
		const next: FitState = {
			visibleCount: countFittingChips({
				widths,
				available: slot.getBoundingClientRect().width,
				gap: CHIP_GAP_PX,
				moreWidth,
			}),
			present: widths.map((width) => width > 0),
			moreWidth,
		};
		setFit((prev) => (sameFit(prev, next) ? prev : next));
	}, [chipCount]);

	useLayoutEffect(() => {
		measure();
		const observer = new ResizeObserver(measure);
		if (slotRef.current) observer.observe(slotRef.current);
		for (const chip of chipRefs.current.slice(0, chipCount)) if (chip) observer.observe(chip);
		if (moreRef.current) observer.observe(moreRef.current);
		return () => observer.disconnect();
	}, [measure, chipCount]);

	return { slotRef, chipRefs, moreRef, fit };
}

interface RowChipOverflowProps {
	/** In display order; chips drop off from the end first. */
	chips: OverflowChip[];
	className?: string;
}

/**
 * A list row's chip slot. Meant to sit after a `flex-[0_1_auto]` title as
 * `flex: 1 1 0` (applied here), so it gets exactly the space the title leaves
 * over. Whole chips that don't fit drop off from the right and are counted in a
 * "+N" pill (same look as FieldLabel's own overflow pill); hovering or clicking
 * that pill opens a card with the hidden chips, still interactive. When even the
 * pill doesn't fit, the slot keeps the pill's width and the title truncates.
 */
export function RowChipOverflow({ chips, className }: RowChipOverflowProps) {
	const { slotRef, chipRefs, moreRef, fit } = useChipFit(chips.length);

	const hiddenChips = chips.filter((_, i) => i >= fit.visibleCount && fit.present[i]);
	const hiddenCount = hiddenChips.reduce((sum, chip) => sum + chip.valueCount, 0);
	const totalCount = chips.reduce((sum, chip, i) => sum + (fit.present[i] ? chip.valueCount : 0), 0);

	return (
		<div
			ref={slotRef}
			className={cn("relative flex flex-[1_1_0] min-w-0 items-center justify-end gap-1 overflow-hidden", className)}
			style={hiddenCount > 0 ? { minWidth: fit.moreWidth } : undefined}
		>
			{chips.map((chip, i) => {
				const hidden = i >= fit.visibleCount;
				return (
					<span
						key={chip.id}
						ref={(el) => {
							chipRefs.current[i] = el;
						}}
						aria-hidden={hidden || undefined}
						inert={hidden}
						className={cn(
							"flex w-max shrink-0 items-center empty:hidden",
							hidden && "invisible absolute left-0 pointer-events-none"
						)}
					>
						{chip.node}
					</span>
				);
			})}
			{/* Always mounted (empty when there's nothing to count) so the observer always has it. */}
			<span
				ref={moreRef}
				className={cn(
					"flex w-max shrink-0 empty:hidden",
					hiddenCount === 0 && "invisible absolute left-0 pointer-events-none"
				)}
				aria-hidden={hiddenCount === 0 || undefined}
				inert={hiddenCount === 0}
			>
				{hiddenCount > 0 ? (
					<ChipOverflowMore count={hiddenCount} chips={hiddenChips} />
				) : totalCount > 0 ? (
					// Measuring stand-in so the pill's width is known before anything is hidden.
					<Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-medium">
						+{totalCount}
					</Badge>
				) : null}
			</span>
		</div>
	);
}

/** An open picker inside the card: a Base UI trigger (popover) or a vaul one (mobile drawer). */
const OPEN_PICKER_SELECTOR = "[data-popup-open], [data-state='open']";

function ChipOverflowMore({ count, chips }: { count: number; chips: OverflowChip[] }) {
	const [open, setOpen] = useState(false);
	const popupRef = useRef<HTMLDivElement>(null);

	// The pickers inside the card portal their own popups, which the card's hover/outside-press
	// logic doesn't know about — keep the card (and so the picker) mounted while one is open.
	const handleOpenChange = (next: boolean) => {
		if (!next && popupRef.current?.querySelector(OPEN_PICKER_SELECTOR)) return;
		setOpen(next);
	};

	return (
		<HoverCard open={open} onOpenChange={handleOpenChange}>
			<HoverCardTrigger
				delay={300}
				closeDelay={150}
				render={
					<Badge
						variant="secondary"
						data-no-propagate
						className="h-5 px-1.5 text-[11px] font-medium cursor-pointer"
						onClick={() => setOpen(true)}
					/>
				}
			>
				+{count}
			</HoverCardTrigger>
			{/* data-no-propagate: React events bubble out of the portal into the row's Link, whose
			    click handler ignores anything inside a [data-no-propagate] element. */}
			<HoverCardContent
				ref={popupRef}
				data-no-propagate
				side="bottom"
				align="end"
				sideOffset={6}
				className="flex w-max max-w-[28rem] flex-wrap items-center gap-1 rounded-xl p-1"
			>
				{chips.map((chip) => (
					<span key={chip.id} className="flex items-center">
						{chip.overflowNode ?? chip.node}
					</span>
				))}
			</HoverCardContent>
		</HoverCard>
	);
}
