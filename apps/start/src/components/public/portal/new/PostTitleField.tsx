import type { schema } from "@repo/database";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { type RefObject, useId } from "react";
import { SimilarPostsList } from "@/components/public/portal/new/SimilarPostsList";

interface PostTitleFieldProps {
	value: string;
	onChange: (title: string) => void;
	/** Lets the page focus the title on mount and when Post is pressed without one. */
	inputRef: RefObject<HTMLInputElement | null>;
	/** Posts already on the board that match the title as typed. */
	similar: schema.TaskWithLabels[];
}

/** The new post form's title input, with the live "posts look similar" list under it. */
export function PostTitleField({ value, onChange, inputRef, similar }: PostTitleFieldProps) {
	const titleId = useId();

	return (
		<div>
			<Label variant="subheading" htmlFor={titleId} className="mb-2 flex items-center gap-2">
				Title
			</Label>
			<Input
				ref={inputRef}
				id={titleId}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="Short, descriptive title"
				autoComplete="off"
				className="h-[52px] px-4 font-medium text-[17px] max-md:px-3.5 max-md:text-base"
			/>
			{similar.length > 0 && <SimilarPostsList posts={similar} />}
		</div>
	);
}
