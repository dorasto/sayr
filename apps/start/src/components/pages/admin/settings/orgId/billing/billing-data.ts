// Re-export plan limits from the shared edition package
export { getEffectiveLimits as getPlanLimits } from "@repo/edition";
export type { PlanLimits } from "@repo/edition";

export interface PlanFeature {
	name: string;
	included: boolean;
}

export interface Plan {
	id: string;
	name: string;
	price: number;
	description: string;
	features: PlanFeature[];
}

export const PLANS: Plan[] = [
	{
		id: "free",
		name: "Free",
		price: 0,
		description: "For small teams getting started with project management.",
		features: [
			{ name: "Up to 5 members", included: true },
			{ name: "3 saved views", included: true },
			{ name: "3 issue templates", included: true },
			{ name: "1 team", included: true },
			{ name: "Releases", included: false },
		],
	},
	{
		id: "pro",
		name: "Pro",
		price: 3,
		description: "For growing teams that need releases, advanced views, and granular permissions.",
		features: [
			{ name: "Unlimited members", included: true },
			{ name: "Unlimited saved views", included: true },
			{ name: "Unlimited issue templates", included: true },
			{ name: "Unlimited teams", included: true },
			{ name: "Unlimited releases", included: true },
		],
	},
];

export interface Invoice {
	id: string;
	date: string;
	amount: string;
	status: "paid" | "pending" | "failed";
}

export const INVOICES: Invoice[] = [];
