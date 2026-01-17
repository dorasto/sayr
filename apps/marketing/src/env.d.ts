/// <reference types="astro/client" />

declare module "virtual:starlight-page-actions/config" {
	interface Actions {
		chatgpt?: boolean;
		claude?: boolean;
		t3chat?: boolean;
		v0?: boolean;
		markdown?: boolean;
		custom?: Record<string, CustomAction>;
	}

	interface CustomAction {
		label: string;
		href: string;
	}

	export interface PageActionsConfig {
		prompt?: string;
		baseUrl?: string;
		actions?: Actions;
	}

	const config: PageActionsConfig;
	export default config;
}
