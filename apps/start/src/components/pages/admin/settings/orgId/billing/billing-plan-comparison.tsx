import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { IconCheck, IconX } from "@tabler/icons-react";
import { PLANS } from "./billing-data";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";

const API_URL =
	import.meta.env.VITE_APP_ENV === "development"
		? "/backend-api/internal"
		: "/api/internal";

export function BillingPlanComparison() {
	const { organization } = useLayoutOrganizationSettings();

	return (
		<div className="flex flex-col gap-3">
			<span className="text-sm font-medium text-foreground">Compare plans</span>
			<div className="grid grid-cols-2 gap-3">
				{PLANS.map((plan) => {
					const isCurrent = plan.id === organization.plan;
					const currentPlanIndex = PLANS.findIndex((p) => p.id === organization.plan);
					const thisPlanIndex = PLANS.findIndex((p) => p.id === plan.id);
					const isDowngrade = thisPlanIndex < currentPlanIndex;
					return (
						<div
							key={plan.id}
							className={cn(
								"rounded-lg border p-4 flex flex-col gap-4",
								isCurrent && "border-primary/30 bg-primary/5",
							)}
						>
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-2">
									<span className="font-semibold text-foreground">{plan.name}</span>
									{isCurrent && (
										<Badge variant="outline" className="text-xs">
											Current
										</Badge>
									)}
									{plan.id === "pro" && !isCurrent && <Badge className="text-xs">Popular</Badge>}
								</div>
								<span className="text-sm text-muted-foreground">
									{plan.price === 0 ? "Free" : `$${plan.price}/seat/mo`}
								</span>
							</div>

							<div className="flex flex-col gap-2">
								{plan.features.map((feature) => (
									<div key={feature.name} className="flex items-center gap-2">
										{feature.included ? (
											<IconCheck className="size-3.5 text-primary shrink-0" />
										) : (
											<IconX className="size-3.5 text-muted-foreground/40 shrink-0" />
										)}
										<span
											className={cn(
												"text-xs",
												feature.included ? "text-muted-foreground" : "text-muted-foreground/40",
											)}
										>
											{feature.name}
										</span>
									</div>
								))}
							</div>

							<div className="mt-auto pt-2">
								{isCurrent ? (
									<Button variant="outline" size="sm" className="w-full" disabled>
										Current plan
									</Button>
								) : isDowngrade ? (
									<a href={`${API_URL}/v1/polar/customer-portal?orgId=${organization.id}`}>
										<Button variant="destructive" size="sm" className="w-full">
											Downgrade
										</Button>
									</a>
								) : (
									<Button size="sm" className="w-full">
										Upgrade
									</Button>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
