export { getRequestyAdapter } from "./client.js";
export { embedText, embedTexts } from "./embed.js";
export {
	DEFAULT_MODEL_ID,
	EMBEDDING_DIMENSIONS,
	EMBEDDING_MODEL_ID,
	REQUESTY_MODEL_CATALOG,
	type RequestyMetadata,
	type RequestyModelId,
	type RequestyModelInfo,
	resolveModelId,
} from "./models.js";
export {
	type GenerateTextOptions,
	generateText,
	type StreamChunk,
	type StreamTokenUsage,
	streamText,
} from "./text.js";
