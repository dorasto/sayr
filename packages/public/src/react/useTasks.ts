import { useEffect, useState } from "react";
import type { Task } from "../types";
import { useSayrWS } from "./useSayrWS";
import Sayr from "..";
export function useTasks(
    slug?: string,
    wsUrl?: string
) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);

    function fetchTasks() {
        if (!slug) return;
        setLoading(true);
        Sayr.org.tasks.list(slug)
            .then((r) => setTasks(r.data))
            .finally(() => setLoading(false));
    }

    useEffect(fetchTasks, [slug]);

    useSayrWS(wsUrl, {
        [Sayr.WS_EVENTS.CREATE_TASK]: fetchTasks,
        [Sayr.WS_EVENTS.UPDATE_TASK]: fetchTasks
    });

    return { tasks, loading, refetch: fetchTasks };
}