import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ComparisonSection() {
	const rows = [
		{ feature: "Public task portal for users", sayr: true, linear: false, canny: true },
		{ feature: "Task, label, and comment visibility control", sayr: true, linear: false, canny: false },
		{ feature: "Internal + public comments", sayr: true, linear: false, canny: "partial" },
		{ feature: "Full project management (board, sprints, priorities)", sayr: true, linear: true, canny: false },
		{ feature: "GitHub integration (issues, PRs, branches)", sayr: true, linear: true, canny: false },
		{ feature: "User voting on tasks", sayr: true, linear: false, canny: true },
		{ feature: "Self-hostable", sayr: true, linear: false, canny: false },
		{ feature: "Open source", sayr: true, linear: false, canny: false },
		{ feature: "Real-time collaboration (WebSocket)", sayr: true, linear: true, canny: false },
		{ feature: "Role-based access control", sayr: true, linear: true, canny: "partial" },
		{ feature: "Categories and labels", sayr: true, linear: "partial", canny: "partial" },
		{ feature: "Task templates", sayr: true, linear: true, canny: true },
	];

	const renderCell = (val: boolean | string) => {
		if (val === true) return <Check className="size-4 text-success mx-auto" />;
		if (val === "partial") return <span className="text-[10px] text-muted-foreground">Partial</span>;
		return <span className="text-muted-foreground/30">{"\u2014"}</span>;
	};

	return (
		<section className="py-24 px-6">
			<div className="max-w-(--breakpoint-md) mx-auto">
				<div className="text-center mb-12">
					<Badge variant="secondary" className="rounded-full py-1 px-3 mb-4">
						Compare
					</Badge>
					<h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
						The best of both worlds
					</h2>
					<p className="mt-3 text-muted-foreground max-w-lg mx-auto">
						Linear is powerful but closed. Canny collects feedback but doesn't manage work. Sayr does both — and it's open source.
					</p>
				</div>
				<div className="rounded-2xl border bg-card overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b bg-muted/30">
									<th className="text-left p-4 font-medium text-muted-foreground">Feature</th>
									<th className="text-center p-4 font-semibold text-primary">Sayr</th>
									<th className="text-center p-4 font-medium text-muted-foreground">Linear</th>
									<th className="text-center p-4 font-medium text-muted-foreground">Canny</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((r) => (
									<tr key={r.feature} className="border-b last:border-b-0">
										<td className="p-4 text-foreground text-xs">{r.feature}</td>
										<td className="p-4 text-center">{renderCell(r.sayr)}</td>
										<td className="p-4 text-center">{renderCell(r.linear)}</td>
										<td className="p-4 text-center">{renderCell(r.canny)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</section>
	);
}
