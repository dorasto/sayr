import {
    Organization,
    Label,
    Category,
    Task,
    Comment,
    Pagination,
    ApiSuccess
} from "./types";

const API = "https://api.sayr.io";

async function get<T>(url: string): Promise<T> {
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw json;
    return json;
}

export const org = {
    async get(slug: string): Promise<Organization> {
        const r = await get<ApiSuccess<Organization>>(
            `${API}/organization/${slug}`
        );
        return r.data;
    },

    async labels(slug: string): Promise<Label[]> {
        const r = await get<ApiSuccess<Label[]>>(
            `${API}/organization/${slug}/labels`
        );
        return r.data;
    },

    async categories(
        slug: string,
        order: "asc" | "desc" = "desc"
    ): Promise<Category[]> {
        const r = await get<ApiSuccess<Category[]>>(
            `${API}/organization/${slug}/categories?order=${order}`
        );
        return r.data;
    },

    async tasks(
        slug: string,
        opts?: { order?: "asc" | "desc"; limit?: number; page?: number }
    ): Promise<{ data: Task[]; pagination: Pagination }> {
        const q = new URLSearchParams({
            order: opts?.order ?? "desc",
            limit: String(opts?.limit ?? 5),
            page: String(opts?.page ?? 1)
        });

        const res = await fetch(
            `${API}/organization/${slug}/tasks?${q}`
        );
        const json = await res.json();
        if (!json.success) throw json;

        return {
            data: json.data,
            pagination: json.pagination
        };
    },

    async task(slug: string, shortId: number): Promise<Task> {
        const r = await get<ApiSuccess<Task>>(
            `${API}/organization/${slug}/tasks/${shortId}`
        );
        return r.data;
    },

    async comments(
        slug: string,
        shortId: number,
        opts?: { order?: "asc" | "desc"; limit?: number; page?: number }
    ): Promise<{ data: Comment[]; pagination: Pagination }> {
        const q = new URLSearchParams({
            order: opts?.order ?? "desc",
            limit: String(opts?.limit ?? 5),
            page: String(opts?.page ?? 1)
        });

        const res = await fetch(
            `${API}/organization/${slug}/tasks/${shortId}/comments?${q}`
        );
        const json = await res.json();
        if (!json.success) throw json;

        return {
            data: json.data,
            pagination: json.pagination
        };
    }
};