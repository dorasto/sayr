import { Label } from "@repo/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { useId } from "react";
import { isPostPriority, POST_PRIORITIES, type PostPriority } from "@/lib/portal/new-post";

interface PriorityPickerProps {
	value: PostPriority;
	onChange: (priority: PostPriority) => void;
}

/** The new post form's priority select. */
export function PriorityPicker({ value, onChange }: PriorityPickerProps) {
	const priorityId = useId();

	return (
		<div className="md:max-w-60">
			<Label variant="subheading" htmlFor={priorityId} className="mb-2 flex items-center gap-2">
				Priority
			</Label>
			<Select value={value} items={POST_PRIORITIES} onValueChange={(next) => isPostPriority(next) && onChange(next)}>
				<SelectTrigger id={priorityId} className="h-10 w-full max-md:h-11">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{POST_PRIORITIES.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
