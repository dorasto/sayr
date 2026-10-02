import { Label } from "@repo/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { cn } from "@repo/ui/lib/utils";
import { useId } from "react";

interface TemplatePickerProps {
	/** The chosen template id, or the "no template" value. */
	value: string;
	/** The "no template" option first, then the org's templates. */
	items: { value: string; label: string }[];
	/** The org disallows blank posts, so a template must be chosen. */
	required: boolean;
	/** `required` and nothing chosen yet. */
	missing: boolean;
	onSelect: (templateId: string) => void;
}

/** The new post form's template select, with a hint that says what a template fills in (or that one is required). */
export function TemplatePicker({ value, items, required, missing, onSelect }: TemplatePickerProps) {
	const selectId = useId();
	const hintId = useId();

	return (
		<div>
			<Label variant="subheading" htmlFor={selectId} className="mb-2 flex items-center gap-2">
				Template <span className="font-normal text-muted-foreground">{required ? "Required" : "Optional"}</span>
			</Label>
			<Select value={value} items={items} required={required} onValueChange={(next) => next && onSelect(next)}>
				<SelectTrigger
					id={selectId}
					aria-describedby={hintId}
					className={cn("h-10 w-full max-md:h-11", missing && "border-primary/50")}
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{items.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<p id={hintId} className="mt-2 text-[13px] text-muted-foreground leading-[19px]">
				{missing
					? "This board asks you to start from a template. Pick one to continue."
					: "A template fills in the title, details, kind, priority and labels. You can change any of them."}
			</p>
		</div>
	);
}
