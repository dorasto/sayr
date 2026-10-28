import { IconCheck, IconMinus } from "@tabler/icons-react";

/** true = has it, false = doesn't, "partial" = partly, or a short text answer like "$79/mo". */
type Cell = boolean | "partial" | string;

interface ComparisonTableProps {
	/** Column headers after the feature column; the first is Sayr's and is highlighted. */
	columns: string[];
	rows: { feature: string; values: Cell[]; note?: string }[];
}

function CellValue({ value }: { value: Cell | undefined }) {
	if (value === true) return <IconCheck aria-label="Yes" className="mx-auto size-4 text-success" />;
	if (value === false || value === undefined)
		return <IconMinus aria-label="No" className="mx-auto size-4 text-muted-foreground/40" />;
	if (value === "partial") return <span className="text-muted-foreground text-xs">Partial</span>;
	return <span className="text-xs">{value}</span>;
}

/**
 * A feature-by-feature table for comparison pages, used from MDX:
 * `<ComparisonTable columns={["Sayr", "Canny"]} rows={[{ feature: "…", values: [true, "partial"] }]} />`.
 * A real <table>, so search engines and AI crawlers can read it.
 */
export function ComparisonTable({ columns, rows }: ComparisonTableProps) {
	return (
		<div className="not-prose my-8 overflow-x-auto rounded-2xl border bg-card">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b bg-muted/30">
						<th scope="col" className="p-4 text-left font-medium text-muted-foreground">
							Feature
						</th>
						{columns.map((column, index) => (
							<th
								key={column}
								scope="col"
								className={
									index === 0
										? "p-4 text-center font-semibold text-primary"
										: "p-4 text-center font-medium text-muted-foreground"
								}
							>
								{column}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.feature} className="border-b last:border-b-0">
							<th scope="row" className="p-4 text-left font-normal">
								{row.feature}
								{row.note && <span className="mt-0.5 block text-muted-foreground text-xs">{row.note}</span>}
							</th>
							{columns.map((column, index) => (
								<td key={column} className="p-4 text-center">
									<CellValue value={row.values[index]} />
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
