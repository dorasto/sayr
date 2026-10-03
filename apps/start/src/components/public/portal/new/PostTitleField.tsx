import type { schema } from "@repo/database";
import { Input } from "@repo/ui/components/input";
import { SimilarPostsList } from "@/components/public/portal/new/SimilarPostsList";

interface PostTitleFieldProps {
	value: string;
	onChange: (title: string) => void;
	/** Posts already on the board that match the title as typed. */
	similar: schema.TaskWithLabels[];
}

/** The new post form's title (the admin creator's borderless `strong` input), with similar posts under it. */
export function PostTitleField({ value, onChange, similar }: PostTitleFieldProps) {
	return (
		<div>
			<Input
				variant="strong"
				aria-label="Title"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="Short, descriptive title"
				autoComplete="off"
				className="p-0"
			/>
			{similar.length > 0 && <SimilarPostsList posts={similar} />}
		</div>
	);
}
