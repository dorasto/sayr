import { useEffect, useState } from "react";
import { org, wsTypes } from "..";
import type { Comment } from "../types";
import { useSayrWS } from "./useSayrWS";

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
        org
            .comments(slug, shortId)
            .then((r) => setComments(r.data))
            .finally(() => setLoading(false));
    }

    useEffect(fetchComments, [slug, shortId]);

    useSayrWS(wsUrl, {
        [wsTypes.UPDATE_TASK_COMMENTS]: fetchComments
    });

    return { comments, loading, refetch: fetchComments };
}