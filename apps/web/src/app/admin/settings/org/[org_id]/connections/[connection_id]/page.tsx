import { notFound } from "next/navigation";
import { connections } from "@/app/components/admin/settings/organization/connections-data";
import { SubWrapper } from "@/app/components/layout/wrapper";

export default async function ConnectionPage({
	params,
}: {
	params: Promise<{ org_id: string; connection_id: string }>;
}) {
	const { connection_id } = await params;
	const connection = connections.find((c) => c.id === connection_id);

	if (!connection) {
		notFound();
	}

	return (
		<SubWrapper
			title={connection.name}
			description={connection.description}
			icon={<connection.icon />}
			style="compact"
			backButton={`/admin/settings/org/${(await params).org_id}/connections`}
		>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
			<div className="text-2xl text-muted-foreground">
				Connection settings for {connection.name} will appear here.
			</div>
		</SubWrapper>
	);
}
