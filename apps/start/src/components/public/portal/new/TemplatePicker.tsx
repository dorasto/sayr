import type { schema } from "@repo/database";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxSearch,
	ComboBoxTrigger,
	ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import { cn } from "@repo/ui/lib/utils";
import { IconTemplate } from "@tabler/icons-react";

interface TemplatePickerProps {
	templates: schema.issueTemplateWithRelations[];
	/** The chosen template id, or `noTemplateValue`. */
	value: string;
	/** The value that means "no template". */
	noTemplateValue: string;
	/** The org requires a template, so "No template" is not offered. */
	required: boolean;
	onSelect: (templateId: string) => void;
}

/** The form's template chip (top left), the same combobox the admin task creator uses. */
export function TemplatePicker({ templates, value, noTemplateValue, required, onSelect }: TemplatePickerProps) {
	const selected = templates.find((template) => template.id === value);

	return (
		<ComboBox value={value} onValueChange={(next) => onSelect(next || noTemplateValue)}>
			<ComboBoxTrigger
				className={cn(
					"mb-0 flex h-7 w-fit items-center gap-2 rounded-lg border border-transparent bg-accent px-2 text-accent-foreground text-xs hover:border-border hover:bg-secondary",
					!selected &&
						"bg-transparent text-muted-foreground hover:border-accent hover:bg-accent hover:text-foreground"
				)}
			>
				<IconTemplate className="size-4" />
				<ComboBoxValue placeholder="Template">{selected?.name ?? "Template"}</ComboBoxValue>
			</ComboBoxTrigger>
			<ComboBoxContent>
				<ComboBoxSearch placeholder="Search templates..." />
				<ComboBoxList>
					<ComboBoxEmpty>No templates found.</ComboBoxEmpty>
					<ComboBoxGroup>
						{!required && <ComboBoxItem value={noTemplateValue}>No template</ComboBoxItem>}
						{templates.map((template) => (
							<ComboBoxItem key={template.id} value={template.id}>
								{template.name}
							</ComboBoxItem>
						))}
					</ComboBoxGroup>
				</ComboBoxList>
			</ComboBoxContent>
		</ComboBox>
	);
}
