import {
    Comment,
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
 * Organization task comments.
 */
export default {
    /**
     * Lists public comments for a task.
     *
     * @since v1.0.0
     */
    async list(
        slug: string,
        shortId: number,
        params?: OrderedPaginationParams,
        opts?: RequestOptions,
    ): Promise<
        ApiResult<{
            items: Comment[];
            pagination: Pagination;
        }>
    > {
        try {
            const q = buildPaginationParams(params);

            const r = await request<
                ApiSuccess<Comment[]> & { pagination: Pagination }
            >(
                `/v1/organization/${slug}/tasks/${shortId}/comments?${q}`,
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
                    "Failed to fetch task comments",
            };
        }
    },
};