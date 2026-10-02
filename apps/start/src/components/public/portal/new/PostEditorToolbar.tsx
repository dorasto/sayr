import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";
import { IconBold, IconCheck, IconCode, IconLink, IconList, IconPhoto, IconTrash } from "@tabler/icons-react";
import type { BasicExtension } from "prosekit/basic";
import type { Editor } from "prosekit/core";
import type { ImageExtension } from "prosekit/extensions/image";
import type { LinkAttrs } from "prosekit/extensions/link";
import { useEditor, useEditorDerivedValue } from "prosekit/react";
import { PopoverContent, PopoverRoot, PopoverTrigger } from "prosekit/react/popover";
import { type FormEvent, type ReactNode, useState } from "react";
import { handleMediaUpload } from "@/components/prosekit/utils/uploadMedia";
import { isSafeLinkHref } from "@/lib/portal/link-safety";

function getCurrentLink(editor: Editor<BasicExtension>): string {
	const { $from } = editor.state.selection;
	for (const mark of $from.marksAcross($from) ?? []) {
		if (mark.type.name === "link") return (mark.attrs as LinkAttrs).href;
	}
	return "";
}

function getItems(editor: Editor<BasicExtension>) {
	return {
		bold: {
			active: editor.marks.bold.isActive(),
			enabled: editor.commands.toggleBold.canExec(),
			run: () => editor.commands.toggleBold(),
		},
		list: {
			active: editor.nodes.list.isActive({ kind: "bullet" }),
			enabled: editor.commands.toggleList.canExec({ kind: "bullet" }),
			run: () => editor.commands.toggleList({ kind: "bullet" }),
		},
		code: {
			active: editor.marks.code.isActive(),
			enabled: editor.commands.toggleCode.canExec(),
			run: () => editor.commands.toggleCode(),
		},
		link: {
			active: editor.marks.link.isActive(),
			enabled: editor.commands.addLink.canExec({ href: "" }),
			href: getCurrentLink(editor),
		},
	};
}

interface ToolbarButtonProps {
	label: string;
	title?: string;
	pressed?: boolean;
	disabled?: boolean;
	type?: "button" | "submit";
	/** Keep the text selection (and focus) in the editor while the button is used. */
	holdFocus?: boolean;
	onClick?: () => void;
	children: ReactNode;
}

function ToolbarButton({
	label,
	title = label,
	pressed,
	disabled,
	type = "button",
	holdFocus,
	onClick,
	children,
}: ToolbarButtonProps) {
	return (
		<Button
			type={type}
			variant="ghost"
			size="icon"
			title={title}
			aria-label={label}
			aria-pressed={pressed}
			disabled={disabled}
			onMouseDown={holdFocus ? (event) => event.preventDefault() : undefined}
			onClick={onClick}
			className="size-8 max-md:size-11 aria-pressed:bg-primary/15 aria-pressed:text-primary"
		>
			{children}
		</Button>
	);
}

function LinkButton({ active, enabled, href }: { active: boolean; enabled: boolean; href: string }) {
	const editor = useEditor<BasicExtension>();
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		setError(null);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const value = new FormData(event.currentTarget).get("href");
		const next = typeof value === "string" ? value.trim() : "";
		if (next && !isSafeLinkHref(next)) {
			setError("Use a link that starts with http://, https:// or mailto:");
			return;
		}
		if (next) editor.commands.addLink({ href: next });
		else editor.commands.removeLink();
		handleOpenChange(false);
		editor.focus();
	};

	return (
		<PopoverRoot open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger>
				<ToolbarButton
					label="Link"
					title={enabled ? "Link" : "Select text to add a link"}
					pressed={active}
					disabled={!enabled}
				>
					<IconLink aria-hidden className="size-4" />
				</ToolbarButton>
			</PopoverTrigger>
			<PopoverContent className="z-10 box-border w-72 rounded-md border bg-popover p-2 text-popover-foreground shadow-md [&:not([data-state])]:hidden">
				<form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-1.5">
					<Input
						// Remount per open so the field starts from the current link.
						key={String(open)}
						name="href"
						type="url"
						defaultValue={href}
						placeholder="Paste the link"
						aria-label="Link address"
						aria-invalid={error !== null}
						aria-describedby={error ? "post-link-error" : undefined}
						onChange={() => setError(null)}
						className="h-8 min-w-0 flex-1 px-2.5 max-md:h-11"
					/>
					<ToolbarButton type="submit" label="Apply link">
						<IconCheck aria-hidden className="size-4" />
					</ToolbarButton>
					{active && (
						<ToolbarButton
							label="Remove link"
							onClick={() => {
								editor.commands.removeLink();
								handleOpenChange(false);
								editor.focus();
							}}
						>
							<IconTrash aria-hidden className="size-4" />
						</ToolbarButton>
					)}
					{error && (
						<p id="post-link-error" role="alert" className="basis-full text-[12.5px] text-destructive">
							{error}
						</p>
					)}
				</form>
			</PopoverContent>
		</PopoverRoot>
	);
}

/**
 * The new post form's minimal editor toolbar: bold, bullet list, code, link and image. Rendered through the shared
 * `Editor`'s `toolbar` slot so it sits inside the ProseKit context. Images become `blob:` URLs here and are uploaded by
 * `processUploads` on submit, exactly like pasted ones.
 */
export function PostEditorToolbar({ className }: { className?: string }) {
	const items = useEditorDerivedValue(getItems);
	const imageEditor = useEditor<ImageExtension>();

	return (
		<div className={cn("flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5", className)}>
			<ToolbarButton
				label="Bold"
				holdFocus
				pressed={items.bold.active}
				disabled={!items.bold.enabled}
				onClick={items.bold.run}
			>
				<IconBold aria-hidden className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				label="Bulleted list"
				holdFocus
				pressed={items.list.active}
				disabled={!items.list.enabled}
				onClick={items.list.run}
			>
				<IconList aria-hidden className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				label="Code"
				holdFocus
				pressed={items.code.active}
				disabled={!items.code.enabled}
				onClick={items.code.run}
			>
				<IconCode aria-hidden className="size-4" />
			</ToolbarButton>
			<LinkButton active={items.link.active} enabled={items.link.enabled} href={items.link.href} />
			<ToolbarButton label="Add an image" holdFocus onClick={() => void handleMediaUpload(imageEditor, "image")}>
				<IconPhoto aria-hidden className="size-4" />
			</ToolbarButton>
		</div>
	);
}
