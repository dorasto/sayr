import { Input } from "@repo/ui/components/input";
import { IconCheck, IconLink, IconTrash } from "@tabler/icons-react";
import type { BasicExtension } from "prosekit/basic";
import { useEditor } from "prosekit/react";
import { PopoverContent, PopoverRoot, PopoverTrigger } from "prosekit/react/popover";
import { type FormEvent, useState } from "react";
import { ToolbarButton } from "@/components/public/portal/new/ToolbarButton";
import { isSafeLinkHref } from "@/lib/portal/link-safety";

interface LinkButtonProps {
	active: boolean;
	enabled: boolean;
	href: string;
}

/** The editor toolbar's link button: a popover to add, change or remove the link on the selected text. */
export function LinkButton({ active, enabled, href }: LinkButtonProps) {
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
