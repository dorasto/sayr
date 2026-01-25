import type { schema } from "@repo/database";
import {
	IconArchive,
	IconChecklist,
	IconProgress,
	IconRocket,
} from "@tabler/icons-react";

export const releaseStatusConfig = {
	planned: {
		label: "Planned",
		icon: (className: string) => <IconChecklist className={className} />,
		className: "text-blue-500",
		color: "#3B82F6",
		hsla: "hsla(217.22, 91.22%, 59.8%, 1)",
		badgeClassName:
			"bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20",
	},
	"in-progress": {
		label: "In Progress",
		icon: (className: string) => <IconProgress className={className} />,
		className: "text-yellow-500",
		color: "#F59E0B",
		hsla: "hsla(37.69, 92.13%, 50.2%, 1)",
		badgeClassName:
			"bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20",
	},
	released: {
		label: "Released",
		icon: (className: string) => <IconRocket className={className} />,
		className: "text-green-500",
		color: "#10B981",
		hsla: "hsla(141.43, 99.9%, 59.8%, 1)",
		badgeClassName:
			"bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20",
	},
	archived: {
		label: "Archived",
		icon: (className: string) => <IconArchive className={className} />,
		className: "text-gray-500",
		color: "#6B7280",
		hsla: "hsla(220, 8.94%, 46.08%, 1)",
		badgeClassName:
			"bg-gray-500/10 text-gray-500 border-gray-500/20 hover:bg-gray-500/20",
	},
} as const;

export type ReleaseStatusKey = keyof typeof releaseStatusConfig;

export const RELEASE_STATUS_ORDER: Array<ReleaseStatusKey> = [
	"planned",
	"in-progress",
	"released",
	"archived",
];

export const getReleaseStatusConfig = (
	status: schema.releaseType["status"],
) => {
	return releaseStatusConfig[status as ReleaseStatusKey];
};
