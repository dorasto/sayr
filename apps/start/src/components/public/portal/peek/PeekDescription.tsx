import type { schema } from "@repo/database";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { lazy, Suspense } from "react";
import type { PeekPost } from "@/lib/portal/peek";
import { DESCRIPTION_PROSE } from "../post/prose";

const Editor = lazy(() => import("@/components/prosekit/editor"));

interface PeekDescriptionProps {
	post: PeekPost;
	tasks: schema.TaskWithLabels[];
}

/** The post's read-only description, in the narrow panel's type size (15/24 instead of the post page's 16/28). */
export function PeekDescription({ post, tasks }: PeekDescriptionProps) {
	return (
		<div className={cn(DESCRIPTION_PROSE, "text-[15px] leading-6 prose-li:leading-6 prose-p:leading-6")}>
			<Suspense fallback={<Skeleton className="h-20" />}>
				<Editor readonly defaultContent={post.description} tasks={tasks} hideBlockHandle />
			</Suspense>
		</div>
	);
}
