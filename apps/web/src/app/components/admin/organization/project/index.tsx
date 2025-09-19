"use client";
import type { schema } from "@repo/database";
import {
	AdaptiveDialog,
	AdaptiveDialogContent,
	AdaptiveDialogDescription,
	AdaptiveDialogFooter,
	AdaptiveDialogHeader,
	AdaptiveDialogTitle,
	AdaptiveDialogTrigger,
} from "@repo/ui/components/adaptive-dialog";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useState } from "react";
import { useLayoutData } from "@/app/admin/Context";
import { Editor } from "@/app/components/blocknote/DynamicEditor";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import { StatusSelector } from "./issue/creator/status";

type Props = {
	_organization: schema.OrganizationWithMembers;
	_project: schema.projectType;
};

export default function OrganizationProjectHomePage({ _organization, _project }: Props) {
	const { account, ws } = useLayoutData();
	const { value: wsStatus } = useStateManagement<string>("ws-status", "Disconnected");
	const { value: organization, setValue: setOrganization } = useStateManagement<schema.OrganizationWithMembers>(
		"organization",
		_organization,
		30000
	);
	const { value: project, setValue: setProject } = useStateManagement<schema.projectType>("project", _project, 30000);
	// biome-ignore lint/correctness/useExhaustiveDependencies: <only run on mount>
	useEffect(() => {
		setOrganization(_organization);
		setProject(_project);
	}, []);
	const { messages, wsSubscribedState } = useWebSocketSubscription({
		ws,
		orgId: _organization.id,
		organization: organization,
		channel: `project-${project.id}`,
		setOrganization: setOrganization,
	});
	// useEffect(() => {
	// 	if (!ws) return;
	// 	const handleMessage = (event: MessageEvent) => {
	// 		const data = JSON.parse(event.data) as WSMessage;
	// 		if (data.type === "UPDATE_ORG") {
	// 			setOrganization({ ...organization, ...data.data });
	// 		}
	// 	};
	// 	ws.addEventListener("message", handleMessage);
	// 	// Cleanup on unmount or dependency change
	// 	return () => {
	// 		ws.removeEventListener("message", handleMessage);
	// 	};
	// }, [ws, organization, setOrganization]);
	const [open, setOpen] = useState(false);
	return (
		<div className="">
			<div className="flex items-center gap-3 w-full">
				<Button onClick={() => setOpen(true)}>New issue</Button>
				<AdaptiveDialog open={open} onOpenChange={setOpen}>
					<AdaptiveDialogContent className="">
						<AdaptiveDialogHeader>
							<AdaptiveDialogTitle asChild>
								<>
									<Label variant={"heading"} className="text-left mr-auto sr-only">
										New issue
									</Label>
									<Input variant={"strong"} placeholder="Issue title" className="px-0" />
								</>
							</AdaptiveDialogTitle>
							<AdaptiveDialogDescription className="sr-only">Create a new issue</AdaptiveDialogDescription>
						</AdaptiveDialogHeader>
						<div className="flex flex-col gap-3 w-full p-3">
							<div className="flex flex-col gap-1 w-full">
								<div className="w-full max-h-96 overflow-scroll">
									<Editor language="en" />
								</div>
							</div>
						</div>
						<AdaptiveDialogFooter className="mt-auto bg-background flex !flex-col gap-2">
							<div className="flex items-center gap-3 w-full">
								<StatusSelector />
							</div>
							<div className="flex items-center gap-2 ml-auto">
								<Button variant={"accent"} onClick={() => {}}>
									Create issue
								</Button>
							</div>
						</AdaptiveDialogFooter>
					</AdaptiveDialogContent>
				</AdaptiveDialog>
			</div>
		</div>
	);
}
