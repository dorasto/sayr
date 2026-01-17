export interface OpenAPISpec {
	openapi: string;
	info: {
		title: string;
		description?: string;
		version: string;
	};
	servers?: Array<{
		url: string;
		description?: string;
	}>;
	paths: Record<string, PathItem>;
	components?: {
		schemas?: Record<string, Schema>;
	};
}

export interface PathItem {
	get?: Operation;
	post?: Operation;
	put?: Operation;
	patch?: Operation;
	delete?: Operation;
	parameters?: Parameter[];
}

export interface Operation {
	operationId?: string;
	summary?: string;
	description?: string;
	tags?: string[];
	parameters?: Parameter[];
	requestBody?: RequestBody;
	responses: Record<string, Response>;
}

export interface Parameter {
	name: string;
	in: "path" | "query" | "header" | "cookie";
	description?: string;
	required?: boolean;
	schema?: Schema;
}

export interface RequestBody {
	description?: string;
	required?: boolean;
	content: Record<string, MediaType>;
}

export interface Response {
	description: string;
	content?: Record<string, MediaType>;
}

export interface MediaType {
	schema?: Schema;
}

export interface Schema {
	type?: string;
	properties?: Record<string, Schema>;
	items?: Schema;
	required?: string[];
	description?: string;
	enum?: string[];
	anyOf?: Schema[];
	const?: unknown;
	minimum?: number;
	maximum?: number;
	default?: unknown;
}

export interface ParsedEndpoint {
	path: string;
	method: string;
	operation: Operation;
	pathParameters: Parameter[];
}

export async function fetchOpenAPISpec(url: string): Promise<OpenAPISpec> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`);
	}
	return response.json();
}

export function parseEndpoints(spec: OpenAPISpec): ParsedEndpoint[] {
	const endpoints: ParsedEndpoint[] = [];
	const methods = ["get", "post", "put", "patch", "delete"] as const;

	for (const [path, pathItem] of Object.entries(spec.paths)) {
		const pathParameters = pathItem.parameters || [];

		for (const method of methods) {
			const operation = pathItem[method];
			if (operation) {
				endpoints.push({
					path,
					method: method.toUpperCase(),
					operation,
					pathParameters,
				});
			}
		}
	}

	return endpoints;
}

export function groupEndpointsByTag(endpoints: ParsedEndpoint[]): Map<string, ParsedEndpoint[]> {
	const groups = new Map<string, ParsedEndpoint[]>();

	for (const endpoint of endpoints) {
		const tags = endpoint.operation.tags || ["Other"];
		for (const tag of tags) {
			if (!groups.has(tag)) {
				groups.set(tag, []);
			}
			groups.get(tag)!.push(endpoint);
		}
	}

	return groups;
}

export function getMethodColor(method: string): string {
	const colors: Record<string, string> = {
		GET: "var(--sl-color-green)",
		POST: "var(--sl-color-blue)",
		PUT: "var(--sl-color-orange)",
		PATCH: "var(--sl-color-yellow)",
		DELETE: "var(--sl-color-red)",
	};
	return colors[method] || "var(--sl-color-gray)";
}

export function formatSchemaType(schema: Schema | undefined): string {
	if (!schema) return "unknown";

	if (schema.anyOf) {
		return schema.anyOf.map((s) => formatSchemaType(s)).join(" | ");
	}

	if (schema.const !== undefined) {
		return JSON.stringify(schema.const);
	}

	if (schema.enum) {
		return schema.enum.map((e) => `"${e}"`).join(" | ");
	}

	if (schema.type === "array" && schema.items) {
		return `${formatSchemaType(schema.items)}[]`;
	}

	return schema.type || "unknown";
}
