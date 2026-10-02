import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { type ChangeEvent, useId } from "react";
import { POST_PRIORITIES, type PostPriority } from "@/lib/portal/new-post";

const FIELD_LABEL = "mb-2 flex items-center gap-2 font-semibold text-sm text-portal-fg";

interface PriorityPickerProps {
	value: PostPriority;
	onChange: (priority: PostPriority) => void;
	className?: string;
}

/** "Priority": a native select (so phones get the system picker) over the five priorities, styled like the template select. */
export function PriorityPicker({ value, onChange, className }: PriorityPickerProps) {
	const id = useId();
	const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
		const next = POST_PRIORITIES.find((priority) => priority.value === event.target.value);
		if (next) onChange(next.value);
	};

	return (
		<div className={className}>
			<label htmlFor={id} className={FIELD_LABEL}>
				Priority
			</label>
			<select
				id={id}
				value={value}
				onChange={handleChange}
				className="h-10 w-full rounded-portal-md border border-portal-line-2 bg-portal-canvas px-3 text-[14.5px] text-portal-fg outline-none transition-[border-color,box-shadow] focus:border-portal-focus max-md:h-11 max-md:text-base"
			>
				{POST_PRIORITIES.map((priority) => (
					<option key={priority.value} value={priority.value}>
						{priority.label}
					</option>
				))}
			</select>
		</div>
	);
}

interface LabelChipsProps {
	labels: ReadonlyArray<schema.labelType>;
	value: ReadonlyArray<string>;
	onChange: (labelIds: string[]) => void;
	className?: string;
}

/** "Labels": the org's labels as multi-select toggle chips (colour dot and name). */
export function LabelChips({ labels, value, onChange, className }: LabelChipsProps) {
	const toggle = (labelId: string) =>
		onChange(value.includes(labelId) ? value.filter((id) => id !== labelId) : [...value, labelId]);

	return (
		<div className={className}>
			<div className={FIELD_LABEL}>Labels</div>
			<fieldset aria-label="Labels" className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
				{labels.map((label) => {
					const selected = value.includes(label.id);
					return (
						<button
							key={label.id}
							type="button"
							aria-pressed={selected}
							onClick={() => toggle(label.id)}
							className={cn(
								"inline-flex h-[34px] shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 font-medium text-[13.5px] outline-none transition-colors max-md:h-11",
								selected
									? "border-portal-accent-line bg-portal-accent-soft text-portal-accent-ink"
									: "border-portal-line-2 text-portal-fg-2 hover:bg-portal-hover focus-visible:bg-portal-hover hover:text-portal-fg focus-visible:text-portal-fg"
							)}
						>
							<i
								aria-hidden
								className="block size-2 shrink-0 rounded-[3px] bg-portal-fg-3"
								style={label.color ? { background: label.color } : undefined}
							/>
							{label.name}
						</button>
					);
				})}
			</fieldset>
		</div>
	);
}
