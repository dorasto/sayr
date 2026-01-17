import { useEffect, useState } from "react";
import { org } from "..";
import type { Task } from "../types";

export function useTask(
    slug?: string,
    shortId?: number
) {
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!slug || shortId == null) return;

        setLoading(true);
        org
            .task(slug, shortId)
            .then(setTask)
            .finally(() => setLoading(false));
    }, [slug, shortId]);

    return { task, loading };
}