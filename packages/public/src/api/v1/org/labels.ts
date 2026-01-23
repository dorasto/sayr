import { Label, ApiSuccess } from "../../../types";
import { request, type RequestOptions } from "../../../client";

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
        opts?: RequestOptions
    ): Promise<Label[]> {
        const r = await request<ApiSuccess<Label[]>>(
            `/v1/organization/${slug}/labels`,
            opts
        );
        return r.data;
    }
};