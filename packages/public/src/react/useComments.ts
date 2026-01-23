import { useCallback, useEffect, useRef, useState } from "react";
import type { Comment } from "../types";
import { useSayrWS } from "./useSayrWS";
import Sayr from "..";

export function useComments(
    slug?: string,
    shortId?: number,
    wsUrl?: string,
) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const fetchComments = useCallback(async () => {
        if (!slug || shortId == null) return;

        setLoading(true);
        setError(null);

        const res = await Sayr.org.comments.list(
            slug,
            shortId,
        );

        if (!mountedRef.current) return;

        if (!res.success) {
            setError(res.error);
            setComments([]);
        } else {
            setComments(res.data?.items ?? []);
        }

        setLoading(false);
    }, [slug, shortId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    useSayrWS(wsUrl, {
        [Sayr.WS_EVENTS.UPDATE_TASK_COMMENTS]: fetchComments,
    });

    return {
        comments,
        loading,
        error,
        refetch: fetchComments,
    };
}