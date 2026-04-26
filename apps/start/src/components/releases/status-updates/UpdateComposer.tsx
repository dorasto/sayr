import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Label } from "@repo/ui/components/label";
import { Toggle } from "@repo/ui/components/toggle";
import { cn } from "@repo/ui/lib/utils";
import { getDisplayName } from "@repo/util";
import { IconArrowBack, IconLock, IconLockOpen2 } from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { lazy, Suspense, useState } from "react";
import { type Health, type Visibility, healthConfig } from "./types";

const Editor = lazy(() => import("@/components/prosekit/editor"));

interface UpdateComposerProps {
	account: schema.UserSummary | null | undefined;
	availableUsers: schema.UserSummary[];
	onPost: (content: schema.NodeJSON, health: Health, visibility: Visibility) => Promise<void>;
	onCancel: () => void;
}

export function UpdateComposer({ account, availableUsers, onPost, onCancel }: UpdateComposerProps) {
	const [health, setHealth] = useState<Health>("on_track");
	const [visibility, setVisibility] = useState<Visibility>("internal");
	const [content, setContent] = useState<schema.NodeJSON | undefined>();
	const [editorKey, setEditorKey] = useState(0);
	const [isPosting, setIsPosting] = useState(false);

	const displayName = account ? getDisplayName(account) : "You";

	const handlePost = async () => {
		if (!content) return;
		setIsPosting(true);
		try {
			await onPost(content, health, visibility);
			// Reset composer
			setContent(undefined);
			setHealth("on_track");
			setVisibility("internal");
			setEditorKey((k) => k + 1);
		} finally {
			setIsPosting(false);
		}
	};

	return (
		<div
			className={cn(
				"text-foreground rounded-lg border px-4 py-2 bg-accent/50",
				visibility === "internal" && "border-primary/30 bg-primary/5",
			)}
		>
			{/* Health picker */}
			<div className="flex items-center gap-2 flex-wrap mb-1">
				<Label variant="description" className="text-xs text-muted-foreground">
					Health
				</Label>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Badge
							variant="outline"
							className={cn("gap-1 text-xs cursor-pointer border", healthConfig[health].className)}
						>
							{healthConfig[health].icon} {healthConfig[health].label}
						</Badge>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						{(["on_track", "at_risk", "off_track"] as Health[]).map((h) => (
							<DropdownMenuItem key={h} onClick={() => setHealth(h)}>
								<span className={cn("flex items-center gap-2", healthConfig[h].className)}>
									{healthConfig[h].icon} {healthConfig[h].label}
								</span>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Editor row */}
			<div className="flex items-start gap-2">
				<Avatar className="h-5 w-5 shrink-0 rounded-full mt-2">
					<AvatarImage src={account?.image || "/avatar.jpg"} alt={displayName} />
					<AvatarFallback className="rounded-full bg-muted text-[10px] uppercase">
						{displayName.slice(0, 2)}
					</AvatarFallback>
				</Avatar>

				<div className="flex-1 min-w-0">
					<Suspense fallback={<div className="h-8 animate-pulse bg-muted rounded" />}>
						<Editor
							key={editorKey}
							onChange={setContent}
							hideBlockHandle
							firstLinePlaceholder="What's the current status of this release?"
							mentionViewUsers={availableUsers}
							submit={handlePost}
						/>
					</Suspense>
				</div>

				<ButtonGroup>
					<Button
						variant="primary"
						size="sm"
						disabled={!content || isPosting}
						onClick={handlePost}
						className={cn("border-0", visibility === "internal" && "bg-primary/10 hover:bg-primary/20")}
					>
						Post
						<IconArrowBack />
					</Button>
					<Toggle
						aria-label="Toggle visibility"
						size="sm"
						className={cn(
							"border-0 bg-accent hover:bg-secondary",
							visibility === "internal" && "bg-primary/10! hover:bg-primary/20!",
						)}
						variant="primary"
						pressed={visibility === "internal"}
						onPressedChange={(pressed) => setVisibility(pressed ? "internal" : "public")}
					>
						{visibility === "internal" ? <IconLock /> : <IconLockOpen2 />}
					</Toggle>
				</ButtonGroup>
			</div>

			<div className="flex justify-end mt-1">
				<Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground text-xs">
					Cancel
				</Button>
			</div>
		</div>
	);
}
