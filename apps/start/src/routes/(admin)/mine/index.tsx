import { createFileRoute } from "@tanstack/react-router";
import { useLayoutData } from "@/components/generic/Context";

export const Route = createFileRoute("/(admin)/mine/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { account } = useLayoutData();
	return <div>/admin/mine/</div>;
}
