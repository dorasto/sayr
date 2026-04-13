import { Mistral } from "@mistralai/mistralai";

let _client: Mistral | null = null;

export function getMistralClient(): Mistral {
	const apiKey = process.env.MISTRAL_API_KEY;
	if (!apiKey) {
		throw new Error("MISTRAL_API_KEY environment variable is not set");
	}
	if (!_client) {
		_client = new Mistral({ apiKey });
	}
	return _client;
}
