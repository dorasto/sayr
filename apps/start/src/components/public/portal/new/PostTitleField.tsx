import { Input } from "@repo/ui/components/input";

interface PostTitleFieldProps {
	value: string;
	onChange: (title: string) => void;
}

/** The new post form's title: the admin creator's borderless `strong` input. */
export function PostTitleField({ value, onChange }: PostTitleFieldProps) {
	return (
		<Input
			variant="strong"
			aria-label="Title"
			value={value}
			onChange={(event) => onChange(event.target.value)}
			placeholder="Short, descriptive title"
			autoComplete="off"
			className="p-0"
		/>
	);
}
