import { ApiResult, request, type RequestOptions } from "../../../client";
import { ApiSuccess, Organization } from "../../../types";

export interface Me {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    createdAt: string;
}

/**
 * Authenticated user API — Version 1.
 *
 * @since v1.0.0
 */
export default {
    async get(opts?: RequestOptions): Promise<ApiResult<Me>> {
        try {
            const r = await request<ApiSuccess<Me>>("/v1/me", opts);
            return {
                success: true,
                data: r.data,
                error: null,
            };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                error: err?.message ?? "Failed to fetch user",
            };
        }
    },

    async organizations(
        opts?: RequestOptions,
    ): Promise<ApiResult<Organization[]>> {
        try {
            const r = await request<ApiSuccess<Organization[]>>(
                "/v1/me/organizations",
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
                error: err?.message ?? "Failed to fetch organizations",
            };
        }
    },
};