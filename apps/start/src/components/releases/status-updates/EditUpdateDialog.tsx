import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import { Badge } from "@repo/ui/components/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Toggle } from "@repo/ui/components/toggle";
import {
	AdaptiveDialog,
	AdaptiveDialogContent,
	AdaptiveDialogDescription,
	AdaptiveDialogFooter,
	AdaptiveDialogHeader,
	AdaptiveDialogTitle,
} from "@repo/ui/components/adaptive-dialog";
import { cn } from "@repo/ui/lib/utils";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { IconCheck, IconLock, IconLockOpen2, IconX } from "@tabler/icons-react";
import { lazy, Suspense, useState } from "react";
import { motion } from "motion/react";
import { type Health, type Visibility, healthConfig } from "./types";

const Editor = lazy(() => import("@/components/prosekit/editor"));

interface EditUpdateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	availableUsers: schema.UserSummary[];
	initialContent: schema.NodeJSON | undefined;
	initialHealth: Health;
	initialVisibility: Visibility;
	onSave: (data: {
		content: schema.NodeJSON | undefined;
		health: Health;
		visibility: Visibility;
	}) => Promise<boolean>;
}

const DIALOG_SIZES = {
	width: "min(42rem, calc(100vw - 2rem))",
	minHeight: "20rem",
	maxHeight: "min(36rem, calc(100vh - 4rem))",
	transition: {
		type: "tween" as const,
		ease: "easeInOut" as const,
		duration: 0.2,
	},
} as const;

export function EditUpdateDialog({
	open,
	onOpenChange,
	availableUsers,
	initialContent,
	initialHealth,
	initialVisibility,
	onSave,
}: EditUpdateDialogProps) {
	const isMobile = useIsMobile();
	const [health, setHealth] = useState<Health>(initialHealth);
	const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
	const [content, setContent] = useState<schema.NodeJSON | undefined>(initialContent);
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const success = await onSave({ content, health, visibility });
			if (success) onOpenChange(false);
		} finally {
			setIsSaving(false);
		}
	};

	const handleClose = () => {
		// Reset to initial values on cancel
		setHealth(initialHealth);
		setVisibility(initialVisibility);
		setContent(initialContent);
		onOpenChange(false);
	};

	return (
		<AdaptiveDialog open={open} onOpenChange={onOpenChange}>
			<AdaptiveDialogContent
				className={cn("z-50 border", !isMobile && "md:max-w-none! md:w-auto! md:h-auto!", !isMobile && "top-[15%]! translate-y-0!")}
				childClassName={cn(!isMobile && "flex flex-col min-h-0 overflow-hidden")}
				showClose={false}
			>
				<motion.div
					className={cn(!isMobile && "flex flex-col")}
					initial={false}
					animate={{ width: !isMobile ? DIALOG_SIZES.width : "100%" }}
					transition={DIALOG_SIZES.transition}
					style={{
						height: "auto",
						minHeight: !isMobile ? DIALOG_SIZES.minHeight : undefined,
						maxHeight: !isMobile ? DIALOG_SIZES.maxHeight : undefined,
					}}
				>
					<AdaptiveDialogHeader className={cn(!isMobile && "pb-0!")}>
						<AdaptiveDialogTitle asChild>
							<div className="flex items-center justify-between w-full">
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
											<DropdownMenuItem
												key={h}
												onClick={() => setHealth(h)}
												className={cn("flex items-center gap-2", healthConfig[h].className, "bg-transparent! hover:bg-accent!")}
											>
												{healthConfig[h].icon} {healthConfig[h].label}
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
								<Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose}>
									<IconX className="size-4" />
								</Button>
							</div>
						</AdaptiveDialogTitle>
						<AdaptiveDialogDescription className="sr-only">Edit status update</AdaptiveDialogDescription>
					</AdaptiveDialogHeader>

					<div className="flex flex-col flex-1 min-h-0 p-3 pt-2 gap-3">
						<div className="flex-1 min-h-0">
							<Suspense fallback={<div className="h-16 animate-pulse bg-muted rounded" />}>
								<Editor
									defaultContent={initialContent}
									onChange={setContent}
									hideBlockHandle
									mentionViewUsers={availableUsers}
									submit={handleSave}
								/>
							</Suspense>
						</div>
					</div>

					<AdaptiveDialogFooter className="mt-auto bg-background shrink-0">
						<div className="flex items-center justify-between w-full gap-2">
							<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
								{visibility === "internal" ? (
									<>
										<IconLock size={12} />
										<span>Internal only</span>
									</>
								) : (
									<>
										<IconLockOpen2 size={12} />
										<span>Visible publicly</span>
									</>
								)}
							</div>
							<div className="flex items-center gap-2">
								<Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={handleClose} disabled={isSaving}>
									Cancel
								</Button>
								<ButtonGroup>
									<Button variant="primary" size="sm" className="h-7" disabled={isSaving} onClick={handleSave}>
										<IconCheck className="size-3.5" />
										{isSaving ? "Saving..." : "Save changes"}
									</Button>
									<Toggle
										aria-label="Toggle visibility"
										size="sm"
										className="h-7 border-0 bg-accent hover:bg-secondary"
										variant="primary"
										pressed={visibility === "internal"}
										onPressedChange={(pressed) => setVisibility(pressed ? "internal" : "public")}
									>
										{visibility === "internal" ? <IconLock className="size-3.5" /> : <IconLockOpen2 className="size-3.5" />}
									</Toggle>
								</ButtonGroup>
							</div>
						</div>
					</AdaptiveDialogFooter>
				</motion.div>
			</AdaptiveDialogContent>
		</AdaptiveDialog>
	);
}
