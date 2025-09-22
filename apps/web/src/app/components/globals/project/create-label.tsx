"use client";
import { Button } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import ColorPicker from "@repo/ui/components/tomui/color-picker";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconCheck, IconCircleFilled } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useLayoutOrganization } from "@/app/admin/[organization_id]/Context";
import { createLabelAction } from "@/app/lib/fetches";

interface Props {
	orgId: string;
}

export default function CreateLabel({ orgId }: Props) {
	const { labels, setLabels } = useLayoutOrganization();

	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const [name, setName] = useState("");
	const [color, setColor] = useState("#000000");
	// Mutation for updating organization
	const updateMutation = useMutation({
		mutationFn: async (data: { name: string; color: string }) => {
			headlessToast.loading({
				id: "create-label",
				title: "Creating label...",
				description: "Please wait while we create the label.",
			});
			const result = await createLabelAction(orgId, data, wsClientId);
			if (!result.success) {
				throw new Error(result.error);
			}
			return result.data;
		},
		onSuccess: (data) => {
			setLabels([...labels, data]);
			headlessToast.success({
				id: "create-label",
				title: "Created label",
				description: "The label has been successfully created.",
			});
		},
		onError: (error) => {
			headlessToast.error({
				id: "create-label",
				title: "Failed to create label",
				description: error.message || "An error occurred while creating the label.",
			});
		},
	});
	const handleSubmit = useCallback(
		async (e?: React.FormEvent) => {
			e?.preventDefault();

			try {
				updateMutation.mutate({
					name,
					color,
				});
				// biome-ignore lint/suspicious/noExplicitAny: <any>
			} catch (error: any) {
				console.log("🚀 ~ CreateLabel ~ error:", error);
				headlessToast.error({
					id: "create-label",
					title: "Failed to create label",
					description: error.message || "An error occurred while creating the label.",
				});
			}
		},
		[name, color, updateMutation]
	);
	return (
		<div className="flex items-center gap-3 bg-accent border rounded p-1">
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="accent" size={"icon"} className="shrink-0">
						<IconCircleFilled style={{ color: color }} />
					</Button>
				</PopoverTrigger>
				<PopoverContent>
					<ColorPicker showDebugInfo onChange={setColor} />
				</PopoverContent>
			</Popover>
			<Input
				variant={"ghost"}
				placeholder="Label name"
				className="bg-transparent"
				value={name}
				onChange={(e) => setName(e.target.value)}
			/>
			<Button
				variant="accent"
				size={"icon"}
				className="shrink-0"
				onClick={() => handleSubmit()}
				disabled={name.length === 0 || updateMutation.isPending}
			>
				<IconCheck />
			</Button>
		</div>
	);
}
