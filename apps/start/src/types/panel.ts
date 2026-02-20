import type { ReactNode } from "react";

export type PanelSection = {
	id: string;
	title?: string;
	content: ReactNode;
	priority?: number; // Lower number = appears first. Default is 50.
	show?: boolean; // If present, only show this section when condition is true
};

export type PanelRegistration = {
	sections: PanelSection[];
	title?: string; // Optional header label for this registration's group
	icon?: ReactNode;
	/** Fixed header rendered at the top of the panel, height-matched to PageHeader.Identity (h-11, border-b). */
	header?: ReactNode;
};
