import { IconGripVertical, IconMenu2, IconPlus } from "@tabler/icons-react";
import {
	BlockHandleAdd,
	BlockHandleDraggable,
	BlockHandlePopover,
} from "prosekit/react/block-handle";

interface Props {
	dir?: "ltr" | "rtl";
}

export default function BlockHandle(props: Props) {
	return (
		<BlockHandlePopover
			placement={props.dir === "rtl" ? "right" : "left"}
			className="flex items-center flex-row box-border justify-center transition border-0 [&:not([data-state])]:hidden will-change-transform motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:zoom-in-95 motion-safe:data-[state=closed]:zoom-out-95 motion-safe:data-[state=open]:animate-duration-150 motion-safe:data-[state=closed]:animate-duration-200"
		>
			<BlockHandleAdd className="flex items-center box-border justify-center h-[1.5em] w-[1.5em] rounded-lg cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent">
				<IconPlus className="size-4! block" />
				{/* <div className="i-lucide-plus size-5 block" /> */}
			</BlockHandleAdd>
			<BlockHandleDraggable className="flex items-center box-border justify-center h-[1.5em] w-[1.5em] rounded-lg cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent">
				<IconGripVertical className="size-4! block" />
			</BlockHandleDraggable>
		</BlockHandlePopover>
	);
}
