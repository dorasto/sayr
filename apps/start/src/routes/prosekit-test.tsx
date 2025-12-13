import { createFileRoute } from "@tanstack/react-router";
import Editor from "../components/prosekit/editor";

export const Route = createFileRoute("/prosekit-test")({
	component: ProseKitTestPage,
});

function ProseKitTestPage() {
	return (
		<div className="p-8 h-screen flex flex-col">
			<h1 className="text-2xl font-bold mb-4">ProseKit Full Editor Test</h1>
			<div className="flex-1">
				<Editor />
			</div>
		</div>
	);
}
