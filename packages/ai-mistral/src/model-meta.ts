export const MISTRAL_MODELS = {
	SMALL: "mistral-small-latest",
	MEDIUM: "mistral-medium-latest",
	LARGE: "mistral-large-latest",
} as const;

export type MistralModel = (typeof MISTRAL_MODELS)[keyof typeof MISTRAL_MODELS];

/**
 * Cost per token in USD cents for each Mistral model.
 * Source: https://mistral.ai/technology/#pricing (as of 2025-03)
 * Note: "latest" aliases resolve to specific model versions — update these if pricing changes.
 */
export const MISTRAL_MODEL_PRICING: Record<MistralModel, { inputCentsPerToken: number; outputCentsPerToken: number }> = {
	// mistral-small-latest: $0.10/M input, $0.30/M output
	[MISTRAL_MODELS.SMALL]: {
		inputCentsPerToken: 0.10 / 1_000_000,
		outputCentsPerToken: 0.30 / 1_000_000,
	},
	// mistral-medium-latest: $0.40/M input, $2.00/M output
	[MISTRAL_MODELS.MEDIUM]: {
		inputCentsPerToken: 0.40 / 1_000_000,
		outputCentsPerToken: 2.00 / 1_000_000,
	},
	// mistral-large-latest: $2.00/M input, $6.00/M output
	[MISTRAL_MODELS.LARGE]: {
		inputCentsPerToken: 2.00 / 1_000_000,
		outputCentsPerToken: 6.00 / 1_000_000,
	},
};
