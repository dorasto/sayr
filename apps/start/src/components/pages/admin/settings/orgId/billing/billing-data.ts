export const CURRENT_PLAN = {
	id: "free" as const,
	name: "Free",
	price: 0,
	interval: "month" as const,
};

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
			{ name: "Unlimited tasks", included: true },
			{ name: "Public portal", included: true },
			{ name: "GitHub integration", included: true },
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
			{ name: "Unlimited tasks", included: true },
			{ name: "Public portal", included: true },
			{ name: "GitHub integration", included: true },
			{ name: "Unlimited saved views", included: true },
			{ name: "Unlimited issue templates", included: true },
			{ name: "Unlimited teams", included: true },
			{ name: "Unlimited releases", included: true },
		],
	},
];

export const USAGE = {
	members: { current: 3, limit: 5 },
	savedViews: { current: 1, limit: 3 },
	issueTemplates: { current: 2, limit: 3 },
	teams: { current: 1, limit: 1 },
};

export interface Invoice {
	id: string;
	date: string;
	amount: string;
	status: "paid" | "pending" | "failed";
}

export const INVOICES: Invoice[] = [];
