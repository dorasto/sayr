import { Button } from "@repo/ui/components/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@repo/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import type { CodeBlockAttrs } from "prosekit/extensions/code-block";
import { shikiBundledLanguagesInfo } from "prosekit/extensions/code-block";
import type { ReactNodeViewProps } from "prosekit/react";
import { useState } from "react";

export default function CodeBlockView(props: ReactNodeViewProps) {
	const attrs = props.node.attrs as CodeBlockAttrs;
	const language = attrs.language;
	const [open, setOpen] = useState(false);

	const setLanguage = (language: string) => {
		const attrs: CodeBlockAttrs = { language };
		props.setAttrs(attrs);
		setOpen(false);
	};

	const currentLanguage = shikiBundledLanguagesInfo.find((info) => info.id === language);

	return (
		<>
			{props.view.editable && (
				<div className="relative mx-2 top-3.5 h-0 select-none overflow-visible text-xs" contentEditable={false}>
					<Popover open={open} onOpenChange={setOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								role="combobox"
								aria-expanded={open}
								className="h-6 w-auto justify-between gap-2 px-2 text-xs font-normal opacity-0 hover:opacity-80 [div[data-node-view-root]:hover_&]:opacity-50 hover:[div[data-node-view-root]:hover_&]:opacity-80 transition-opacity"
							>
								{currentLanguage ? currentLanguage.name : "Plain Text"}
								<ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[200px] p-0 max-h-[300px] overflow-hidden">
							<Command>
								<CommandInput placeholder="Search language..." className="h-9" />
								<CommandList>
									<CommandEmpty>No language found.</CommandEmpty>
									<CommandGroup className="max-h-[260px] overflow-y-auto">
										<CommandItem value="plain text" onSelect={() => setLanguage("")}>
											Plain Text
											<Check
												className={cn("ml-auto h-4 w-4", language === "" ? "opacity-100" : "opacity-0")}
											/>
										</CommandItem>
										{shikiBundledLanguagesInfo.map((info) => (
											<CommandItem key={info.id} value={info.name} onSelect={() => setLanguage(info.id)}>
												{info.name}
												<Check
													className={cn(
														"ml-auto h-4 w-4",
														language === info.id ? "opacity-100" : "opacity-0"
													)}
												/>
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</div>
			)}
			<pre ref={props.contentRef} data-language={language} spellCheck={false} className="bg-accent!"></pre>
		</>
	);
}
