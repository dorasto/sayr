import { request, type RequestOptions } from "../../../client";
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
    /**
     * Fetches the currently authenticated user.
     *
     * @since v1.0.0
     */
    async get(opts?: RequestOptions): Promise<Me> {
        const r = await request<ApiSuccess<Me>>(
            "/me",
            opts
        );
        return r.data;
    },

    /**
     * Lists organizations the current user belongs to.
     *
     * @since v1.0.0
     */
    async organizations(
        opts?: RequestOptions
    ): Promise<Organization[]> {
        const r = await request<ApiSuccess<Organization[]>>(
            "/organizations",
            opts
        );
        return r.data;
    }
};