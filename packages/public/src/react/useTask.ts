import { useEffect, useRef, useState } from "react";
import type { Task } from "../types";
import Sayr from "..";

export function useTask(
    slug?: string,
    shortId?: number,
) {
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!slug || shortId == null) return;

        setLoading(true);
        setError(null);

        Sayr.org.tasks.get(slug, shortId).then((res) => {
            if (!mountedRef.current) return;

            if (!res.success) {
                setError(res.error);
                setTask(null);
            } else {
                setTask(res.data);
            }

            setLoading(false);
        });
    }, [slug, shortId]);

    return {
        task,
        loading,
        error,
    };
}