import type {
	DefaultReactGridSuggestionItem,
	GridSuggestionMenuProps,
} from "@blocknote/react";
import { cn } from "@repo/ui/lib/utils";

/**
 * Custom Emoji Picker component using reusable UI components
 * This replaces the default BlockNote emoji picker with a styled version
 * that matches the custom slash menu design
 */
export function CustomEmojiPicker(
	props: GridSuggestionMenuProps<DefaultReactGridSuggestionItem>,
) {
	return (
		<div
			className={cn(
				"flex flex-col gap-1 w-80 rounded-md border bg-popover shadow-md animate-in fade-in-0 zoom-in-95",
			)}
			data-emoji-picker
		>
			<div className="max-h-80 overflow-y-auto overflow-x-hidden p-2">
				<div
					className="grid gap-1"
					style={{
						gridTemplateColumns: `repeat(${props.columns || 8}, minmax(0, 1fr))`,
					}}
				>
					{props.items.map((item, index) => {
						const isSelected = props.selectedIndex === index;

						return (
							<button
								key={`emoji-${item.id}`}
								type="button"
								className={cn(
									"relative flex size-9 cursor-default select-none items-center justify-center rounded-sm text-xl outline-none transition-colors",
									"hover:bg-accent",
									"focus:bg-accent",
									isSelected && "bg-accent",
								)}
								onClick={() => {
									props.onItemClick?.(item);
								}}
							>
								{item.icon}
							</button>
						);
					})}
				</div>
			</div>

			{/* Empty state */}
			{props.items.length === 0 && (
				<div className="py-6 text-center text-sm text-muted-foreground">
					No emojis found
				</div>
			)}
		</div>
	);
}
