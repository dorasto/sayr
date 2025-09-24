"use client";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import ColorPicker, { hslaStringToHex } from "@repo/ui/components/tomui/color-picker";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconCheck, IconCircleFilled } from "@tabler/icons-react";
import { useState } from "react";
import { createLabelAction } from "@/app/lib/fetches";
import { useToastAction } from "@/app/lib/util";

interface Props {
	orgId: string;
	labels: schema.labelType[];
	setLabels: (newValue: Props["labels"]) => void;
}

export default function CreateLabel({ orgId, labels, setLabels }: Props) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const [name, setName] = useState("");
	const [color, setColor] = useState("#000000");
	const { runWithToast, isFetching } = useToastAction();
	return (
		<div className="flex items-center gap-3 bg-accent border rounded p-1">
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="accent" size={"icon"} className="shrink-0">
						<IconCircleFilled style={{ color: color }} />
					</Button>
				</PopoverTrigger>
				<PopoverContent>
					<ColorPicker showDebugInfo onChange={setColor} defaultValue={hslaStringToHex(color)} />
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
				onClick={async () => {
					const data = await runWithToast(
						"create-label",
						{
							loading: {
								title: "Creating label...",
								description: "Please wait while we create the label.",
							},
							success: {
								title: "Label created",
								description: "The label has been successfully created.",
							},
							error: {
								title: "Failed to create label",
								description: "An error occurred while creating the label.",
							},
						},
						() =>
							createLabelAction(
								orgId,
								{
									name,
									color,
								},
								wsClientId
							)
					);
					if (data?.success && data.data) {
						setLabels([...labels, data.data]);
						setName("");
						setColor("#000000");
					}
				}}
				disabled={name.length === 0 || isFetching}
			>
				<IconCheck />
			</Button>
		</div>
	);
}
