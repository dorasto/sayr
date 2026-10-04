import type { schema } from "@repo/database";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { IconChevronRight, IconTemplate } from "@tabler/icons-react";
import RenderIcon from "@/components/generic/RenderIcon";

interface TemplateChooserProps {
	templates: schema.issueTemplateWithRelations[];
	onSelect: (templateId: string) => void;
}

/**
 * The first step of the new post form when the org asks every post to start from a template: just the templates,
 * nothing else. Picking one fills in the form and shows it; the template can still be changed from the form's chip.
 */
export function TemplateChooser({ templates, onSelect }: TemplateChooserProps) {
	return (
		<section aria-labelledby="new-post-template-heading" className="mt-8 max-md:mt-0">
			<Label id="new-post-template-heading" variant="heading" className="block text-base">
				Pick a template to start
			</Label>
			<Label variant="description" className="mt-1 block">
				This board asks every post to start from a template. It fills in the details for you.
			</Label>
			<ul className="mt-4 flex flex-col gap-2">
				{templates.map((template) => (
					<li key={template.id}>
						<Tile
							asChild
							className="cursor-pointer text-left outline-none hover:bg-secondary focus-visible:bg-secondary md:w-full"
						>
							<button type="button" onClick={() => onSelect(template.id)}>
								<TileHeader>
									<TileIcon
										aria-hidden
										style={template.category?.color ? { color: template.category.color } : undefined}
									>
										{template.category?.icon ? (
											<RenderIcon iconName={template.category.icon} size={16} raw />
										) : (
											<IconTemplate />
										)}
									</TileIcon>
									<TileTitle className="truncate text-sm">{template.name}</TileTitle>
									{(template.category || template.titlePrefix) && (
										<TileDescription className="truncate text-xs">
											{[template.category?.name, template.titlePrefix?.trim()].filter(Boolean).join(" · ")}
										</TileDescription>
									)}
								</TileHeader>
								<TileAction>
									<IconChevronRight aria-hidden className="size-4 text-muted-foreground" />
								</TileAction>
							</button>
						</Tile>
					</li>
				))}
			</ul>
		</section>
	);
}
