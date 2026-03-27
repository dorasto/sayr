export const MISTRAL_MODELS = {
	SMALL: "mistral-small-latest",
	MEDIUM: "mistral-medium-latest",
	LARGE: "mistral-large-latest",
} as const;

export type MistralModel = (typeof MISTRAL_MODELS)[keyof typeof MISTRAL_MODELS];
