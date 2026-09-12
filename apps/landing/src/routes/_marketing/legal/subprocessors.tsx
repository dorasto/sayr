import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import subprocessorsData from "@/data/subprocessors.json";
import { seoMeta } from "@/lib/seo";

interface Subprocessor {
	name: string;
	type: string;
	purpose: string;
	dataProcessed: string;
	dataSharedWhen: string;
	location: string;
	website: string;
	dpaUrl: string | null;
}

const { lastUpdated } = subprocessorsData;
const subprocessors = subprocessorsData.subprocessors as Subprocessor[];

const formattedLastUpdated = (() => {
	const [year, month, day] = lastUpdated.split("-").map(Number) as [number, number, number];
	return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
})();

export const Route = createFileRoute("/_marketing/legal/subprocessors")({
	component: SubprocessorsPage,
	head: () =>
		seoMeta({
			title: "Subprocessors",
			description: "List of third-party subprocessors that process data on behalf of Sayr.",
			path: "/legal/subprocessors",
		}),
});

function SubprocessorsPage() {
	return (
		<div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
			<div className="mb-12">
				<h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Subprocessors</h1>
				<p className="mt-4 text-lg text-muted-foreground">
					Sayr uses the following third-party subprocessors to deliver our services. Each subprocessor has been
					selected with data protection in mind.
				</p>
				<p className="mt-2 text-sm text-muted-foreground">
					Last updated: <time dateTime={lastUpdated}>{formattedLastUpdated}</time>
				</p>
			</div>

			<div className="overflow-x-auto rounded-lg border border-border">
				<table className="w-full text-sm text-left">
					<thead className="bg-muted/50 text-muted-foreground">
						<tr>
							<th className="px-4 py-3 font-medium">Subprocessor</th>
							<th className="px-4 py-3 font-medium">Purpose & Data Processed</th>
							<th className="px-4 py-3 font-medium whitespace-nowrap">Data Shared When</th>
							<th className="px-4 py-3 font-medium whitespace-nowrap">Location</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{subprocessors.map((sp, i) => (
							<Fragment key={sp.name}>
								{(i === 0 || sp.type !== subprocessors[i - 1]?.type) && (
									<tr className="bg-muted/30">
										<td
											colSpan={4}
											className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
										>
											{sp.type}
										</td>
									</tr>
								)}
								<tr className="text-foreground">
									<td className="px-4 py-3 font-medium align-top whitespace-nowrap">
										<a
											href={sp.website}
											target="_blank"
											rel="noopener noreferrer"
											className="hover:underline"
										>
											{sp.name}
										</a>
										{sp.dpaUrl && (
											<a
												href={sp.dpaUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="block text-xs text-muted-foreground hover:underline mt-0.5"
											>
												DPA / Privacy
											</a>
										)}
									</td>
									<td className="px-4 py-3 align-top">
										<span className="text-foreground">{sp.purpose}</span>
										<span className="block text-xs text-muted-foreground mt-1">{sp.dataProcessed}</span>
									</td>
									<td className="px-4 py-3 align-top">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
												sp.dataSharedWhen.startsWith("Always")
													? "bg-muted text-muted-foreground"
													: "bg-amber-500/10 text-amber-500"
											}`}
										>
											{sp.dataSharedWhen.startsWith("Always") ? "Always" : "Conditional"}
										</span>
										{!sp.dataSharedWhen.startsWith("Always") && (
											<span className="block text-xs text-muted-foreground mt-1">{sp.dataSharedWhen}</span>
										)}
									</td>
									<td className="px-4 py-3 text-muted-foreground whitespace-nowrap align-top">
										{sp.location}
									</td>
								</tr>
							</Fragment>
						))}
					</tbody>
				</table>
			</div>

			<div className="mt-12 rounded-lg border border-border bg-muted/30 p-6">
				<h2 className="text-lg font-semibold text-foreground">Changes to this list</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					We may update this list from time to time as our infrastructure evolves. If you have questions about our
					subprocessors, please contact us at{" "}
					<a href="mailto:support@sayr.io" className="text-foreground hover:underline">
						support@sayr.io
					</a>
					.
				</p>
			</div>
		</div>
	);
}
