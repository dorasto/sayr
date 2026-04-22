import {
    Pagination,
    ApiSuccess,
    Release,
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
 * Organization releases.
 */
export default {
    /**
     * Lists public releases for an organization.
     *
     * @since v1.0.0
     */
    async list(
        slug: string,
        params?: OrderedPaginationParams,
        opts?: RequestOptions,
    ): Promise<
        ApiResult<{
            items: Release[];
            pagination: Pagination;
        }>
    > {
        try {
            const q = buildPaginationParams(params);

            const r = await request<
                ApiSuccess<Release[]> & { pagination: Pagination }
            >(
                `/v1/organization/${slug}/releases?${q}`,
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
                    "Failed to fetch releases",
            };
        }
    },

    /**
     * Fetches a single public release by slug.
     *
     * @since v1.0.0
     */
    async get(
        slug: string,
        releaseSlug: string,
        opts?: RequestOptions,
    ): Promise<ApiResult<Release>> {
        try {
            const r = await request<ApiSuccess<Release>>(
                `/v1/organization/${slug}/releases/${releaseSlug}`,
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
                    "Failed to fetch release",
            };
        }
    },
};