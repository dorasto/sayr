import {
    Category,
    ApiSuccess,
} from "../../../types";
import {
    ApiResult,
    request,
    type RequestOptions,
} from "../../../client";
import { type Order } from "../../../shared";

/**
 * Organization categories.
 */
export default {
    /**
     * Lists public categories for an organization.
     *
     * @since v1.0.0
     */
    async list(
        slug: string,
        order: Order = "desc",
        opts?: RequestOptions,
    ): Promise<ApiResult<Category[]>> {
        try {
            const r = await request<ApiSuccess<Category[]>>(
                `/v1/organization/${slug}/categories?order=${order}`,
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
                    "Failed to fetch categories",
            };
        }
    },
};