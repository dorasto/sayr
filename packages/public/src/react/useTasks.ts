import { useEffect, useState } from "react";
import { org, wsTypes } from "..";
import type { Task } from "../types";
import { useSayrWS } from "./useSayrWS";
export function useTasks(
    slug?: string,
    wsUrl?: string
) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);

    function fetchTasks() {
        if (!slug) return;
        setLoading(true);
        org
            .tasks(slug)
            .then((r) => setTasks(r.data))
            .finally(() => setLoading(false));
    }

    useEffect(fetchTasks, [slug]);

    useSayrWS(wsUrl, {
        [wsTypes.CREATE_TASK]: fetchTasks,
        [wsTypes.UPDATE_TASK]: fetchTasks
    });

    return { tasks, loading, refetch: fetchTasks };
}