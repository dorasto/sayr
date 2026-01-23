import { useCallback, useEffect, useRef, useState } from "react";
import type { Task } from "../types";
import { useSayrWS } from "./useSayrWS";
import Sayr from "..";

export function useTasks(
    slug?: string,
    wsUrl?: string,
) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const fetchTasks = useCallback(async () => {
        if (!slug) return;

        setLoading(true);
        setError(null);

        const res = await Sayr.org.tasks.list(slug);

        if (!mountedRef.current) return;

        if (!res.success) {
            setError(res.error);
            setTasks([]);
        } else {
            setTasks(res.data?.items ?? []);
        }

        setLoading(false);
    }, [slug]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    useSayrWS(wsUrl, {
        [Sayr.WS_EVENTS.CREATE_TASK]: fetchTasks,
        [Sayr.WS_EVENTS.UPDATE_TASK]: fetchTasks,
    });

    return {
        tasks,
        loading,
        error,
        refetch: fetchTasks,
    };
}