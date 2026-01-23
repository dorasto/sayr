import {
    Category,
    ApiSuccess
} from "../../../types";
import { request, type RequestOptions } from "../../../client";
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
        opts?: RequestOptions
    ): Promise<Category[]> {
        const r = await request<ApiSuccess<Category[]>>(
            `/v1/organization/${slug}/categories?order=${order}`,
            opts
        );
        return r.data;
    }
};