/** Sub-pixel slack so a chip that fits exactly (fractional widths, rounding) isn't dropped. */
const FIT_EPSILON = 0.5;

export interface ChipFitInput {
	/** Natural width of each chip, in display order. 0 = the chip renders nothing (takes no space, no gap). */
	widths: readonly number[];
	/** Width of the slot the chips (and the "+N" pill) have to fit into. */
	available: number;
	/** Flex gap between neighbouring chips / the pill. */
	gap: number;
	/** Width of the "+N" pill, reserved whenever at least one chip is hidden. */
	moreWidth: number;
}

/**
 * How many leading chips fit in a row's chip slot; the rest drop off from the
 * right into a "+N" pill. If every chip fits on its own, they all show (no pill).
 * Otherwise the pill's width (plus a gap) is reserved and as many whole chips as
 * fit before it are kept. Zero-width chips are free and never need a gap.
 *
 * Returns an index into `widths`: chips at indexes below it are shown.
 */
export function countFittingChips({ widths, available, gap, moreWidth }: ChipFitInput): number {
	const limit = available + FIT_EPSILON;
	const present = widths.filter((width) => width > 0);
	const allWidth = present.reduce((sum, width) => sum + width, 0) + Math.max(0, present.length - 1) * gap;
	if (allWidth <= limit) return widths.length;

	let used = 0;
	let shown = 0;
	let fitting = 0;
	for (let i = 0; i < widths.length; i++) {
		const width = widths[i] ?? 0;
		if (width > 0) {
			used += (shown > 0 ? gap : 0) + width;
			shown++;
			if (used + gap + moreWidth > limit) break;
		}
		fitting = i + 1;
	}
	return fitting;
}
