"use client";

import { Button } from "@repo/ui/components/button";
import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error("🔴 Error boundary caught:", error);
	}, [error]);

	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
			{/* Emoji or icon for visual */}
			<div className="mb-6 text-6xl">⚠️</div>

			<h1 className="text-2xl font-semibold text-red-600">Oops, something went wrong</h1>

			<p className="mt-2 max-w-md text-gray-500">
				We hit a snag while loading this part of the app. Don’t worry, you can retry below or head back home.
			</p>

			{error?.message && (
				<pre className="mt-4 max-w-md overflow-auto rounded bg-gray-100 p-3 text-sm text-gray-700">
					{error.message}
				</pre>
			)}

			{error?.digest && (
				<p className="mt-2 text-xs text-gray-400">
					Error ID: <code>{error.digest}</code>
				</p>
			)}

			<div className="mt-6 flex gap-3">
				<Button onClick={() => reset()}>🔄 Try again</Button>
				<Button variant="secondary" asChild>
					<a href="/">🏠 Go home</a>
				</Button>
			</div>
		</div>
	);
}
