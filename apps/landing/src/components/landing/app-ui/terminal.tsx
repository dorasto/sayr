import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A dark terminal window: traffic-light dots, a centred title, and monospace content. */
export function Terminal({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
	return (
		<div
			className={cn(
				"overflow-hidden rounded-xl border bg-[#0c0c0e] font-mono text-[12.5px] shadow-2xl shadow-black/40",
				className
			)}
		>
			<div className="flex items-center gap-2 border-white/10 border-b px-4 py-2 text-[11px] text-white/50">
				<span className="flex gap-1.5" aria-hidden>
					<span className="size-2.5 rounded-full bg-white/20" />
					<span className="size-2.5 rounded-full bg-white/20" />
					<span className="size-2.5 rounded-full bg-white/20" />
				</span>
				<span className="mx-auto">{title}</span>
			</div>
			<pre className="overflow-x-auto p-4 text-white/90 leading-relaxed">
				<code>{children}</code>
			</pre>
		</div>
	);
}

/** A dimmed shell prompt or comment, for use inside `Terminal`. */
export function Dim({ children }: { children: ReactNode }) {
	return <span className="text-white/40">{children}</span>;
}
