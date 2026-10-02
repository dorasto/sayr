import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

interface LabelPickerProps {
	labels: schema.labelType[];
	/** The chosen label ids. */
	value: string[];
	onChange: (labelIds: string[]) => void;
}

/** The new post form's labels: one toggle chip per org label. */
export function LabelPicker({ labels, value, onChange }: LabelPickerProps) {
	return (
		<div>
			<div className="mb-2 flex items-center gap-2 font-semibold text-sm">Labels</div>
			<fieldset aria-label="Labels" className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
				{labels.map((label) => {
					const selected = value.includes(label.id);
					return (
						<Button
							key={label.id}
							variant="outline"
							size="sm"
							aria-pressed={selected}
							onClick={() => onChange(selected ? value.filter((id) => id !== label.id) : [...value, label.id])}
							className={cn(
								"h-[34px] shrink-0 rounded-full px-3 text-[13.5px] max-md:h-11",
								selected
									? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/20"
									: "text-muted-foreground hover:text-foreground"
							)}
						>
							<i
								aria-hidden
								className="block size-2 shrink-0 rounded-[3px] bg-muted-foreground"
								style={label.color ? { background: label.color } : undefined}
							/>
							{label.name}
						</Button>
					);
				})}
			</fieldset>
		</div>
	);
}
