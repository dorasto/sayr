import { schema } from "@repo/database";
import { Skeleton } from "@repo/ui/components/skeleton";
import type { BasicExtension } from "prosekit/basic";
import type { Union } from "prosekit/core";
import type { MentionExtension } from "prosekit/extensions/mention";
import { useEditor } from "prosekit/react";
import {
	AutocompleteEmpty,
	AutocompleteItem,
	AutocompleteList,
	AutocompletePopover,
} from "prosekit/react/autocomplete";
import { TaskMention } from "./TaskMention";

// Match inputs like "#1", "#23", "#456", etc. — requires at least one digit after #
const regex = /#\d+$/;

export default function TaskMenu(props: {
	tasks: schema.TaskWithLabels[];
	loading?: boolean;
	onQueryChange?: (query: string) => void;
	onOpenChange?: (open: boolean) => void;
}) {
	const editor = useEditor<Union<[MentionExtension, BasicExtension]>>();

	// Insert the selected numeric task reference
	const handleTagInsert = (id: string, taskShortId: number) => {
		editor.commands.insertMention({
			id: id.toString(),
			value: `#${taskShortId}`, // tasks are numeric shorthand
			kind: "task",
		});
		// optional: automatically add space
		// editor.commands.insertText({ text: " " });
	};

	return (
		<AutocompletePopover
			regex={regex}
			className="relative block max-h-100 min-w-60 select-none overflow-auto whitespace-nowrap p-1 z-50 box-border rounded-lg border bg-popover text-foreground shadow-lg [&:not([data-state])]:hidden"
			onQueryChange={props.onQueryChange}
			onOpenChange={props.onOpenChange}
		>
			<AutocompleteList>
				<AutocompleteEmpty className="relative flex items-center justify-between min-w-32 scroll-my-1 rounded-sm px-3 py-1.5 box-border cursor-default select-none whitespace-nowrap outline-hidden text-sm">
					{props.loading ? "Loading..." : "No tasks found"}
				</AutocompleteEmpty>

				{props.tasks.map((task) => (
					<AutocompleteItem
						key={task.id}
						className="relative flex items-center justify-between min-w-32 scroll-my-1 rounded-lg px-3 py-1.5 box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
						onSelect={() => handleTagInsert(task.id, task.shortId as number)}
					>
						{props.loading ? <Skeleton className="w-full" /> : <TaskMention task={task} categories={[]} hide />}
					</AutocompleteItem>
				))}
			</AutocompleteList>
		</AutocompletePopover>
	);
}
