import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useState } from "react";
import { requestDataExport } from "@/lib/fetches/user";

/** The Privacy settings section: request a copy of your personal data by email. Admin `/settings` and the portal dialog. */
export function DataExport() {
	const [isLoading, setIsLoading] = useState(false);

	const handleExport = async () => {
		setIsLoading(true);
		try {
			const result = await requestDataExport();
			if (result.success) {
				headlessToast.success({
					title: "Export requested",
					description: "We'll email you a download link when your export is ready.",
				});
			} else {
				headlessToast.error({
					title: result.error || "Failed to request data export",
				});
			}
		} catch {
			headlessToast.error({ title: "Failed to request data export" });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Tile className="md:w-full border border-primary bg-primary/10">
			<TileHeader>
				<TileTitle>Export your data</TileTitle>
				<TileDescription className="text-xs">
					Download a copy of all your personal data. We'll send you an email with a one-time download link when
					it's ready.
				</TileDescription>
			</TileHeader>
			<TileAction>
				<Button
					variant="primary"
					size="sm"
					onClick={handleExport}
					disabled={isLoading}
					className="bg-primary/50 hover:bg-primary/80 text-primary-foreground border-0"
				>
					{isLoading ? "Requesting..." : "Request export"}
				</Button>
			</TileAction>
		</Tile>
	);
}
