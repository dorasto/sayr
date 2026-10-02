import type { schema } from "@repo/database";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { PeekPost } from "@/lib/portal/peek";
import { DESCRIPTION_PROSE } from "../post/prose";

const Editor = lazy(() => import("@/components/prosekit/editor"));

/** The description is clamped to this height (with a fade) in Peek; the full post shows the rest. */
const DESCRIPTION_CLAMP_PX = 240;

interface PeekDescriptionProps {
	post: PeekPost;
	tasks: schema.TaskWithLabels[];
}

/** Read-only description, clamped with a fade when it is longer than `DESCRIPTION_CLAMP_PX`. */
export function PeekDescription({ post, tasks }: PeekDescriptionProps) {
	const innerRef = useRef<HTMLDivElement>(null);
	const [overflowing, setOverflowing] = useState(false);

	// The editor loads lazily and grows after mount, so watch the natural height rather than measuring once.
	useEffect(() => {
		const element = innerRef.current;
		if (!element) return;
		const observer = new ResizeObserver(() => setOverflowing(element.offsetHeight > DESCRIPTION_CLAMP_PX));
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	return (
		<div
			className={cn(
				"overflow-hidden",
				overflowing && "[mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
			)}
			style={{ maxHeight: DESCRIPTION_CLAMP_PX }}
		>
			{/* Description typography for the narrow panel (15/26 instead of the post page's 16/28). */}
			<div
				ref={innerRef}
				className={cn(
					DESCRIPTION_PROSE,
					"text-[15px] leading-[26px] prose-li:leading-[26px] prose-p:leading-[26px]"
				)}
			>
				<Suspense fallback={<Skeleton className="h-20" />}>
					<Editor readonly defaultContent={post.description} tasks={tasks} hideBlockHandle />
				</Suspense>
			</div>
		</div>
	);
}
