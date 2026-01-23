import { useEffect, useState } from "react";
import type { Task } from "../types";
import Sayr from "..";

export function useTask(
    slug?: string,
    shortId?: number
) {
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!slug || shortId == null) return;

        setLoading(true);
        Sayr.org.tasks.get(slug, shortId)
            .then(setTask)
            .finally(() => setLoading(false));
    }, [slug, shortId]);

    return { task, loading };
}