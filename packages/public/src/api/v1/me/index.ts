import { ApiResult, request, type RequestOptions } from "../../../client";
import { ApiSuccess, Organization, TaskPriority, TaskStatus } from "../../../types";

export interface TaskCreated {
    id: string;
    shortId: number;
    title: string;
    orgSlug: string;
    publicPortalUrl: string;
}

export interface CreateTaskInput {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    category?: string;
    orgId: string;
    integration?: {
        id: string;
        name: string;
        platform: string;
    };
    CreatedBy?: {
        type: "github" | "doras" | "discord" | "slack";
        userId: string;
        name: string;
    }
}

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

    async createTask(
        body: CreateTaskInput,
        opts?: RequestOptions,
    ): Promise<ApiResult<TaskCreated>> {
        try {
            const r = await request<ApiSuccess<TaskCreated>>("/v1/me/task", {
                ...opts,
                method: "POST",
                body: body as any,
            });
            return {
                success: true,
                data: r.data,
                error: null,
            };
        } catch (err: any) {
            return {
                success: false,
                data: null,
                error: err?.message ?? "Failed to create task",
            };
        }
    },
};