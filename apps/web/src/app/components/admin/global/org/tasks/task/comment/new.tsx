"use client";

import type { PartialBlock } from "@blocknote/core";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Toggle } from "@repo/ui/components/toggle";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowBack, IconLock, IconLockOpen2 } from "@tabler/icons-react";
import { useState } from "react";
import { Editor } from "@/app/components/blocknote/DynamicEditor";
import { uploadFile } from "@/app/lib/fetches/file";
import { CreateTaskCommentAction } from "@/app/lib/fetches/task";
import { extractTextContent, useToastAction } from "@/app/lib/util";

type CommentVisibility = "internal" | "public";

interface TaskNewCommentContentProps {
	task: schema.TaskWithLabels;
	onFinish?: () => void;
}
export function TaskNewCommentContent({ task, onFinish }: TaskNewCommentContentProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { runWithToast, isFetching } = useToastAction();
	const [newComment, setNewComment] = useState<undefined | PartialBlock[]>(undefined);
	const [editorKey, setEditorKey] = useState(0);
	const [visibility, setVisibility] = useState<CommentVisibility>("public");
	const commentText = extractTextContent(newComment);
	const disabled = isFetching || commentText.length === 0;
	const handleSubmit = async () => {
		if (!newComment || isFetching || commentText.length === 0) {
			headlessToast.error({
				title: "Cannot submit empty comment",
				description: "Please enter some text before submitting your comment.",
				id: "create-task-comment",
			});
			return;
		}

		const updatedBlocks: PartialBlock[] = await Promise.all(
			(newComment ?? []).map(async (block) => {
				if (
					(block.type === "image" || block.type === "file" || block.type === "video" || block.type === "audio") &&
					typeof block.props === "object" &&
					// biome-ignore lint/suspicious/noExplicitAny: <fix>
					typeof (block.props as any).url === "string" &&
					// biome-ignore lint/suspicious/noExplicitAny: <fix>
					(block.props as any).url.startsWith("blob:")
				) {
					headlessToast.info({
						title: "Uploading file...",
						description: "Please wait while your file is being uploaded.",
						id: "create-task-comment",
					});
					const props = block.props as { url: string; name?: string };
					try {
						const blob = await fetch(props.url).then((res) => res.blob());
						const fileName = props.name || `upload-${Date.now()}`;
						const file = new File([blob], fileName, { type: blob.type });
						if (visibility === "internal") {
							const result = await uploadFile(file, task.organizationId);
							if (result.success && result.data?.url) {
								console.log("✅ Uploaded file:", result.data.url);
								URL.revokeObjectURL(props.url);
								// Return updated block with new URL
								return {
									...block,
									props: {
										...block.props,
										url: result.data.url,
										name: fileName,
									},
								} satisfies PartialBlock;
							} else {
								console.error("❌ Upload failed:", result.error);
							}
						} else {
							const result = await uploadFile(file);
							if (result.success && result.data?.url) {
								console.log("✅ Uploaded file:", result.data.url);
								URL.revokeObjectURL(props.url);
								// Return updated block with new URL
								return {
									...block,
									props: {
										...block.props,
										url: result.data.url,
										name: fileName,
									},
								} satisfies PartialBlock;
							} else {
								console.error("❌ Upload failed:", result.error);
							}
						}
					} catch (err) {
						console.error("⚠️ Blob upload failed:", err);
					}
				}

				return block;
			})
		);

		const data = await runWithToast(
			"create-task-comment",
			{
				loading: {
					title: "Posting comment...",
					description: "Your comment is being added to the task.",
				},
				success: {
					title: "Comment added",
					description: "Your comment was saved successfully.",
				},
				error: {
					title: "Couldn’t post comment",
					description: "The comment appears locally but could not be saved to the server. Please try again.",
				},
			},
			() => CreateTaskCommentAction(task.organizationId, task.id, updatedBlocks, visibility, wsClientId)
		);

		if (data?.success && data.data && task && task.id === data.data.id) {
			setNewComment(undefined);
			setEditorKey((prev) => prev + 1);
			onFinish?.();
		}
	};
	return (
		<div
			className={cn(
				"text-foreground mt-2 rounded-lg border px-4 py-3 bg-accent/50 flex flex-col",
				visibility === "internal" && "border-primary/30 bg-primary/5"
			)}
		>
			<Editor
				key={editorKey} // 👈 force rerender when the key changes
				emptyDocumentPlaceholder="Leave a comment"
				trailing={false}
				language="en"
				value={newComment}
				updateContent={newComment}
				onChange={setNewComment}
				onKeyDown={(e) => {
					if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
						e.preventDefault();
						handleSubmit();
					}
				}}
			/>
			<div className="flex items-center gap-2 ml-auto">
				<ButtonGroup>
					<Button
						variant={visibility === "internal" ? "default" : "accent"}
						size={"sm"}
						disabled={disabled}
						onClick={handleSubmit}
						className={cn("border-transparent", visibility === "internal" && "bg-primary/10 hover:bg-primary/20")}
					>
						{visibility === "internal" ? "Internal comment" : "Post comment"}
						<IconArrowBack />
					</Button>
					<Toggle
						aria-label="Toggle visibility"
						size="sm"
						className={cn(
							"border-transparent hover:border-transparent",
							visibility === "internal" && "bg-primary/10! hover:bg-primary/20!"
						)}
						variant={visibility === "internal" ? "primary" : "accent"}
						pressed={visibility === "internal"}
						disabled={disabled}
						onPressedChange={(pressed) => setVisibility(pressed ? "internal" : "public")}
						// className={cn("data-[state=off]:bg-primary/10 data-[state=off]:border-primary/50")}
						defaultPressed={true}
					>
						{visibility === "internal" ? <IconLock /> : <IconLockOpen2 />}
					</Toggle>
				</ButtonGroup>
			</div>
		</div>
	);
}
