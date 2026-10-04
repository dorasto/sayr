import type { schema } from "@repo/database";
import { type QueryClient, useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { mapPublicTask, type PeekPost, type PublicTaskResponse } from "@/lib/portal/peek";

const basePublicApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/public/v1" : "/api/public/v1";

/** Prefix of every fetched-post query for an organization (see `patchPeekPosts`). */
const peekPostsKey = (organizationId: string) => ["peek-post", organizationId] as const;
const peekPostKey = (organizationId: string, shortId: number) => [...peekPostsKey(organizationId), shortId] as const;

/** `null` = the post does not exist or is not public. */
async function fetchPeekPost(orgSlug: string, shortId: number): Promise<PeekPost | null> {
	const res = await fetch(`${basePublicApiUrl}/organization/${orgSlug}/tasks/${shortId}`);
	if (res.status === 404) return null;
	if (!res.ok) throw new Error("Failed to fetch post");
	const json: { data: PublicTaskResponse } = await res.json();
	return mapPublicTask(json.data);
}

/**
 * Applies `update` to every fetched Peek post (posts that were not in the board list), so realtime events reach a
 * deep-linked post the same way they reach the cached list. Return the same reference for posts to leave alone.
 */
export function patchPeekPosts(queryClient: QueryClient, organizationId: string, update: (post: PeekPost) => PeekPost) {
	queryClient.setQueriesData<PeekPost | null>({ queryKey: peekPostsKey(organizationId) }, (old) =>
		old ? update(old) : old
	);
}

export type PeekPostStatus = "idle" | "loading" | "ready" | "missing" | "error";

/**
 * Resolves the post Peek shows. It prefers the live board list (so votes, status and comment stubs follow the same
 * realtime patches as the rows) and only falls back to the public single-post endpoint when the post is not in the
 * loaded pages: a deep link past page one, or a closed post while the Active tab is showing. The last resolved post
 * stays on screen while a swap to one that has to be fetched is in flight.
 */
export function usePeekPost(shortId: number | null, tasks: ReadonlyArray<schema.TaskWithLabels>) {
	const { organization } = usePublicOrganizationLayout();

	const fromList = useMemo(
		() => (shortId === null ? null : (tasks.find((task) => task.shortId === shortId) ?? null)),
		[tasks, shortId]
	);

	const fetched = useQuery<PeekPost | null>({
		queryKey: peekPostKey(organization.id, shortId ?? 0),
		queryFn: () => fetchPeekPost(organization.slug, shortId ?? 0),
		enabled: shortId !== null && fromList === null,
		staleTime: 1000 * 30,
		refetchOnWindowFocus: false,
		retry: false,
	});

	const resolved: PeekPost | null = fromList ?? fetched.data ?? null;

	const lastResolved = useRef<{ shortId: number; post: PeekPost } | null>(null);
	if (resolved && shortId !== null) lastResolved.current = { shortId, post: resolved };

	let post = resolved;
	let status: PeekPostStatus;
	if (shortId === null) status = "idle";
	else if (resolved) status = "ready";
	else if (fetched.isError) status = "error";
	else if (fetched.isSuccess) status = "missing";
	else {
		status = "loading";
		// Keep showing the previous post rather than a skeleton when it is the same one (it dropped out of the list).
		if (lastResolved.current?.shortId === shortId) post = lastResolved.current.post;
	}

	return { post, status };
}
