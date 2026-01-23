import { useEffect, useState } from "react";
import type { Comment } from "../types";
import { useSayrWS } from "./useSayrWS";
import Sayr from "..";

export function useComments(
    slug?: string,
    shortId?: number,
    wsUrl?: string
) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);

    function fetchComments() {
        if (!slug || shortId == null) return;

        setLoading(true);
        Sayr.org.comments.list(slug, shortId)
            .then((r) => setComments(r.data))
            .finally(() => setLoading(false));
    }

    useEffect(fetchComments, [slug, shortId]);

    useSayrWS(wsUrl, {
        [Sayr.WS_EVENTS.UPDATE_TASK_COMMENTS]: fetchComments
    });

    return { comments, loading, refetch: fetchComments };
}