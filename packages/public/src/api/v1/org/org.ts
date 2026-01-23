import { Organization, ApiSuccess } from "../../../types";
import { request, type RequestOptions } from "../../../client";

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
        opts?: RequestOptions
    ): Promise<Organization> {
        const r = await request<ApiSuccess<Organization>>(
            `/v1/organization/${slug}`,
            opts
        );
        return r.data;
    }
};