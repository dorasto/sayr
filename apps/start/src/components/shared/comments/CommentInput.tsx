import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import { Toggle } from "@repo/ui/components/toggle";
import { cn } from "@repo/ui/lib/utils";
import { getDisplayName } from "@repo/util";
import { IconArrowBack, IconLoader2, IconLock, IconLockOpen2 } from "@tabler/icons-react";
import { lazy, Suspense, useCallback, useState } from "react";
import { useLayoutData } from "@/components/generic/Context";

const Editor = lazy(() => import("@/components/prosekit/editor"));

interface CommentInputProps {
	availableUsers: schema.UserSummary[];
	placeholder?: string;
	submitLabel?: string;
	/** Whether to show the internal/public visibility toggle. Defaults to true. */
	showVisibilityToggle?: boolean;
	defaultVisibility?: "public" | "internal";
	onPost: (content: schema.NodeJSON, visibility: "public" | "internal") => Promise<boolean>;
}

export function CommentInput({
	availableUsers,
	placeholder = "Reply...",
	submitLabel,
	showVisibilityToggle = true,
	defaultVisibility = "internal",
	onPost,
}: CommentInputProps) {
	const { account } = useLayoutData();
	const [content, setContent] = useState<schema.NodeJSON | undefined>();
	const [editorKey, setEditorKey] = useState(0);
	const [isPosting, setIsPosting] = useState(false);
	const [visibility, setVisibility] = useState<"public" | "internal">(defaultVisibility);

	const displayName = account ? getDisplayName(account) : "You";

	const handlePost = useCallback(async () => {
		if (!content) return;
		setIsPosting(true);
		try {
			const ok = await onPost(content, visibility);
			if (ok) {
				setContent(undefined);
				setEditorKey((k) => k + 1);
			}
		} finally {
			setIsPosting(false);
		}
	}, [content, visibility, onPost]);

	return (
		<div className="text-foreground transition-all flex gap-2 items-start px-3 py-2">
			<Avatar className="h-5 w-5 shrink-0 rounded-full mt-2">
				<AvatarImage src={account?.image || "/avatar.jpg"} alt={displayName} />
				<AvatarFallback className="rounded-full bg-muted text-[10px] uppercase">
					{displayName.slice(0, 2)}
				</AvatarFallback>
			</Avatar>
			<div className="flex-1 min-w-0 flex items-center gap-2">
				<div className="flex-1 min-w-0">
					<Suspense fallback={<div className="h-8 animate-pulse bg-muted rounded" />}>
						<Editor
							key={editorKey}
							onChange={setContent}
							hideBlockHandle
							firstLinePlaceholder={placeholder}
							mentionViewUsers={availableUsers}
							submit={handlePost}
						/>
					</Suspense>
				</div>
				<ButtonGroup>
					{submitLabel ? (
						<Button
							variant="primary"
							size="sm"
							disabled={!content || isPosting}
							onClick={handlePost}
							className={cn("border-0 h-7", showVisibilityToggle && visibility === "internal" && "bg-primary/10 hover:bg-primary/20")}
						>
							{isPosting ? <IconLoader2 className="animate-spin size-4" /> : submitLabel}
							{!isPosting && <IconArrowBack size={14} />}
						</Button>
					) : (
						<Button
							variant="primary"
							size="icon"
							disabled={!content || isPosting}
							onClick={handlePost}
							className="h-7 w-7 shrink-0"
						>
							{isPosting ? <IconLoader2 className="animate-spin size-4" /> : <IconArrowBack size={14} />}
						</Button>
					)}
					{showVisibilityToggle && (
						<Toggle
							aria-label="Toggle visibility"
							size="sm"
							className={cn(
								"border-0 bg-accent hover:bg-secondary h-7 w-7",
								visibility === "internal" && "bg-primary/10! hover:bg-primary/20!",
							)}
							variant="primary"
							pressed={visibility === "internal"}
							onPressedChange={(pressed) => setVisibility(pressed ? "internal" : "public")}
						>
							{visibility === "internal" ? <IconLock size={14} /> : <IconLockOpen2 size={14} />}
						</Toggle>
					)}
				</ButtonGroup>
			</div>
		</div>
	);
}
