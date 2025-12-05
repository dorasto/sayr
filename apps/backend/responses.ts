import { z } from "zod";

export const ApiPaginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) =>
	z.object({
		success: z.literal(true),
		data: z.array(itemSchema),
		pagination: z.object({
			limit: z.number(),
			page: z.number(),
			totalPages: z.number(),
			totalItems: z.number(),
			hasMore: z.boolean(),
		}),
	});

export const ApiSuccessResponse = <T extends z.ZodTypeAny>(schema: T) =>
	z.object({
		success: z.literal(true),
		data: schema,
	});

export const ApiErrorResponse = z.object({
	success: z.literal(false),
	error: z.string(),
	message: z.string().optional(),
});

// src/utils/responses.ts
export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	pagination?: PaginationMeta;
	error?: string;
	message?: string;
}

/**
 * Standard success response
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
	return {
		success: true,
		data,
		...(message ? { message } : {}),
	};
}

/**
 * Standard error response
 */
export function errorResponse(error: string, message?: string): ApiResponse<never> {
	return {
		success: false,
		error,
		...(message ? { message } : {}),
	};
}

export interface PaginationMeta {
	limit: number;
	page: number;
	totalPages: number;
	totalItems: number;
	hasMore: boolean;
}
/**
 * Standard paginated success response
 */
export function paginatedSuccessResponse<T>(data: T, pagination: PaginationMeta, message?: string): ApiResponse<T> {
	return {
		success: true,
		data,
		pagination,
		...(message ? { message } : {}),
	};
}
