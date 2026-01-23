import {
    Task,
    Pagination,
    ApiSuccess
} from "../../../types";
import { request, type RequestOptions } from "../../../client";
import {
    type OrderedPaginationParams,
    buildPaginationParams
} from "../../../shared";

/**
 * Organization tasks.
 */
export default {
    /**
     * Lists public tasks for an organization.
     *
     * @since v1.0.0
     */
    async list(
        slug: string,
        params?: OrderedPaginationParams,
        opts?: RequestOptions
    ): Promise<{ data: Task[]; pagination: Pagination }> {
        const q = buildPaginationParams(params);

        const r = await request<
            ApiSuccess<Task[]> & { pagination: Pagination }
        >(
            `/v1/organization/${slug}/tasks?${q}`,
            opts
        );

        return {
            data: r.data,
            pagination: r.pagination
        };
    },

    /**
     * Fetches a single public task by short ID.
     *
     * @since v1.0.0
     */
    async get(
        slug: string,
        shortId: number,
        opts?: RequestOptions
    ): Promise<Task> {
        const r = await request<ApiSuccess<Task>>(
            `/v1/organization/${slug}/tasks/${shortId}`,
            opts
        );
        return r.data;
    }
};