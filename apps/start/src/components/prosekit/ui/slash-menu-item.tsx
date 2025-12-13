import { Kbd } from "@repo/ui/components/kbd";
import { Label } from "@repo/ui/components/label";
import { AutocompleteItem } from "prosekit/react/autocomplete";

export default function SlashMenuItem(props: {
	label: string;
	kbd?: string;
	icon?: React.ReactNode;
	onSelect: () => void;
}) {
	return (
		<AutocompleteItem
			onSelect={props.onSelect}
			className="relative flex items-center justify-between min-w-32 scroll-my-1 rounded-lg px-3 py-1.5 box-border cursor-default select-none whitespace-nowrap outline-hidden data-focused:bg-accent text-foreground"
		>
			<div className="flex items-center gap-1">
				{props.icon && props.icon}
				<Label>{props.label}</Label>
			</div>
			{props.kbd && <Kbd className="bg-transparent font-mono">{props.kbd}</Kbd>}
		</AutocompleteItem>
	);
}
