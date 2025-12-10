import { Button } from "@repo/ui/components/button";
import type { ErrorComponentProps } from "@tanstack/react-router";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
	console.error("DefaultCatchBoundary Error:", error);

	return (
		<div className="via-surface to-surface flex min-h-screen items-center justify-center bg-[conic-gradient(at_bottom_left,var(--tw-gradient-stops))] from-primary">
			<div className="mx-auto max-w-2xl text-center text-white px-6">
				{/* Header */}
				<h1 className="text-6xl font-black mb-5 drop-shadow-lg">
					Something went wrong
				</h1>
				<p className="mb-8 text-lg text-white/90 leading-relaxed">
					{error.message ||
						"An unexpected error occurred. Please try again or report this issue."}
				</p>

				{/* Buttons */}
				<div className="flex justify-center flex-wrap gap-4 mb-10">
					<Button
						variant="secondary"
						onClick={() => {
							window.location.reload();
						}}
					>
						Try again
					</Button>
					<a
						href="https://doras.to/discord"
						target="_blank"
						rel="noopener noreferrer"
					>
						<Button variant="ghost">Report issue</Button>
					</a>
				</div>

				{/* Debug/Error details (dev-friendly but styled) */}
				<div className="text-left bg-white/10 backdrop-blur-sm border border-white/20 rounded-md p-6 shadow-xl max-h-[50vh] overflow-auto">
					<h2 className="text-xl font-semibold mb-3 text-white/95">
						Error details
					</h2>
					<pre className="whitespace-pre-wrap wrap-break-word text-sm font-mono text-red-200 leading-relaxed">
						{error.message}
					</pre>
				</div>

				{/* Footer note */}
				<p className="mt-8 text-xs text-white/60">
					If this keeps happening, please report it so we can fix it.
				</p>
			</div>
		</div>
	);
}