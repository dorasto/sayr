import { Organization, ApiSuccess } from "../../../types";
import { ApiResult, request, type RequestOptions } from "../../../client";

/**
 * Organization core operations.
 */
export default {
    /**
     * Fetches a public organization by slug.
     *
     * @since v1.0.0
     */
    async get(
        slug: string,
        opts?: RequestOptions,
    ): Promise<ApiResult<Organization>> {
        try {
            const r = await request<ApiSuccess<Organization>>(
                `/v1/organization/${slug}`,
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
                error: err?.message ?? "Failed to fetch organization",
            };
        }
    },
};