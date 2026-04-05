export interface ApiSettings {
	enabled: boolean;
	apiKey: string;
	baseUrl: string;
}

export interface ApiItem {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	externalId?: string;
}