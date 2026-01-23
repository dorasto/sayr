import { Label, ApiSuccess } from "../../../types";
import { ApiResult, request, type RequestOptions } from "../../../client";

/**
 * Organization labels.
 */
export default {
    /**
     * Lists public labels for an organization.
     *
     * @since v1.0.0
     */
    async list(
        slug: string,
        opts?: RequestOptions,
    ): Promise<ApiResult<Label[]>> {
        try {
            const r = await request<ApiSuccess<Label[]>>(
                `/v1/organization/${slug}/labels`,
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
                error: err?.message ?? "Failed to fetch labels",
            };
        }
    },
};