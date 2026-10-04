import { useQuery } from "@tanstack/react-query";
import { fetchPublicReleaseTasks } from "@/components/public/portal/releases/types";
import { getReleaseProgress } from "@/lib/portal/release-progress";

/**
 * A release's progress (done / in progress / planned posts), worked out the same way as on the release page
 * (`getReleaseProgress` over its public posts). `null` until the posts have loaded.
 */
export function useReleaseProgress(orgSlug: string, releaseSlug: string) {
	const query = useQuery({
		queryKey: ["public-release-tasks", orgSlug, releaseSlug],
		queryFn: () => fetchPublicReleaseTasks(orgSlug, releaseSlug),
		staleTime: 1000 * 60,
		select: getReleaseProgress,
	});
	return query.data ?? null;
}
