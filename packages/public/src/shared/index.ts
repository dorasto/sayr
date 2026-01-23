/* =======================
 * Shared params & helpers
 * ======================= */

export type Order = "asc" | "desc";

export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface OrderedPaginationParams extends PaginationParams {
    order?: Order;
}

export function buildPaginationParams(
    params?: OrderedPaginationParams
): URLSearchParams {
    return new URLSearchParams({
        order: params?.order ?? "desc",
        limit: String(params?.limit ?? 5),
        page: String(params?.page ?? 1)
    });
}