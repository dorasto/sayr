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

/**
 * Plan-aware usage limits.
 * `null` means unlimited for that plan.
 */
export interface PlanLimits {
	members: number | null;
	savedViews: number | null;
	issueTemplates: number | null;
	teams: number | null;
	releases: number | null;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
	free: {
		members: 5,
		savedViews: 3,
		issueTemplates: 3,
		teams: 1,
		releases: 0,
	},
	pro: {
		members: null,
		savedViews: null,
		issueTemplates: null,
		teams: null,
		releases: null,
	},
	"self-hosted": {
		members: null,
		savedViews: null,
		issueTemplates: null,
		teams: null,
		releases: null,
	},
};

const FREE_LIMITS: PlanLimits = {
	members: 5,
	savedViews: 3,
	issueTemplates: 3,
	teams: 1,
	releases: 0,
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
	const key = plan ?? "free";
	const limits = PLAN_LIMITS[key];
	if (limits !== undefined) {
		return limits;
	}
	return FREE_LIMITS;
}

export interface Invoice {
	id: string;
	date: string;
	amount: string;
	status: "paid" | "pending" | "failed";
}

export const INVOICES: Invoice[] = [];
