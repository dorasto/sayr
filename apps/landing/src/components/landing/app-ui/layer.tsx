import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades a layer in and out in place, so switching views never remounts anything.
 * Layers share one grid cell (the parent is a grid), so the stack is always as
 * tall as its tallest layer and swapping views never changes the page height.
 */
export function Layer({ active, children }: { active: boolean; children: ReactNode }) {
	return (
		<div
			aria-hidden={!active}
			className={cn(
				"col-start-1 row-start-1 transition-[opacity,transform] duration-500 motion-reduce:transition-none",
				active ? "opacity-100" : "pointer-events-none translate-y-1 opacity-0"
			)}
		>
			{children}
		</div>
	);
}
