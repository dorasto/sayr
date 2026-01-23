import {
    Task,
    Pagination,
    ApiSuccess,
} from "../../../types";
import {
    ApiResult,
    request,
    type RequestOptions,
} from "../../../client";
import {
    type OrderedPaginationParams,
    buildPaginationParams,
} from "../../../shared";

/**
 * Organization tasks.
 */
export default {
    /**
     * Lists public tasks for an organization.
     *
     * @since v1.0.0
     */
    async list(
        slug: string,
        params?: OrderedPaginationParams,
        opts?: RequestOptions,
    ): Promise<
        ApiResult<{
            items: Task[];
            pagination: Pagination;
        }>
    > {
        try {
            const q = buildPaginationParams(params);

            const r = await request<
                ApiSuccess<Task[]> & { pagination: Pagination }
            >(
                `/v1/organization/${slug}/tasks?${q}`,
                opts,
            );

            return {
                success: true,
                data: {
                    items: r.data,
                    pagination: r.pagination,
                },
                error: null,
            };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                error:
                    err?.message ??
                    "Failed to fetch tasks",
            };
        }
    },

    /**
     * Fetches a single public task by short ID.
     *
     * @since v1.0.0
     */
    async get(
        slug: string,
        shortId: number,
        opts?: RequestOptions,
    ): Promise<ApiResult<Task>> {
        try {
            const r = await request<ApiSuccess<Task>>(
                `/v1/organization/${slug}/tasks/${shortId}`,
                opts,
            );

            return {
                success: true,
                data: r.data,
                error: null,
            };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                error:
                    err?.message ??
                    "Failed to fetch task",
            };
        }
    },
};