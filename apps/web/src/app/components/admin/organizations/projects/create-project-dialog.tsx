"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { Label } from "@repo/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Slider } from "@repo/ui/components/slider";
import { Switch } from "@repo/ui/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import ColorPicker from "@repo/ui/components/tomui/color-picker";
import LabelledInput from "@repo/ui/components/tomui/labeled-input";
import OptionField from "@repo/ui/components/tomui/option-field";
import { cn } from "@repo/ui/lib/utils";
import { IconColorPicker, IconIcons, IconPlus } from "@tabler/icons-react";

interface CreateProjectDialogProps {
	organization: schema.OrganizationWithMembers;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}
export default function CreateProjectDialog({ open, onOpenChange, organization }: CreateProjectDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{/* <DialogTrigger asChild>
											<Button
												className={cn(
													"text-sidebar-foreground/0 aspect-square p-0 h-4 group-hover/collapsible:text-sidebar-foreground data-[state=open]:text-sidebar-foreground transition-all relative bg-transparent hover:bg-border",
													isMobile && "text-sidebar-foreground"
												)}
											>
												<IconPlus />
												<span className="sr-only">add</span>
											</Button>
										</DialogTrigger> */}
			<DialogContent className="bg-popover">
				<DialogHeader>
					<DialogTitle asChild>
						<Label variant={"heading"} className="text-left mr-auto">
							New Project
						</Label>
					</DialogTitle>
					<DialogDescription className="sr-only">Create a new project</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col items-center gap-3 w-full">
					<div className="flex items-start gap-3 w-full">
						<Popover>
							<PopoverTrigger>
								<Button className="" variant={"accent"} size={"icon"}>
									<IconIcons />
									{/* This changes to whatever the icon/image is set to */}
								</Button>
							</PopoverTrigger>
							<PopoverContent>
								<Tabs defaultValue="icon" className="items-start w-full">
									<TabsList className="h-auto rounded-none border-b bg-transparent p-0 w-full justify-start">
										<TabsTrigger
											value="icon"
											className="data-[state=active]:after:bg-primary relative rounded-none py-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
										>
											Icon
										</TabsTrigger>
										<TabsTrigger
											value="image"
											className="data-[state=active]:after:bg-primary relative rounded-none py-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
										>
											Upload
										</TabsTrigger>
									</TabsList>
									<TabsContent value="icon">
										{/* icons/images... Simpler than Doras, showcase icons but allow an
																		image upload here too in a 1:1 ratio. This will be what's shown on
																		the sidebar. */}
										<div className="flex items-center gap-2">
											<LabelledInput label={"Icon"} id="icon" />
											<Popover>
												<PopoverTrigger>
													<Button className="" variant={"accent"} size={"icon"}>
														<IconColorPicker />
													</Button>
												</PopoverTrigger>
												<PopoverContent>
													<ColorPicker
														showDebugInfo
														// value={primary}
														// onChange={setPrimary}
													/>
												</PopoverContent>
											</Popover>
										</div>
									</TabsContent>
									<TabsContent value="image">
										<p className="text-muted-foreground text-center text-xs">Content for Tab 2</p>
									</TabsContent>
								</Tabs>
							</PopoverContent>
						</Popover>
						<div className="flex flex-col gap-3 w-full">
							<LabelledInput label={"Project name"} id="name" />
							<Label variant={"description"}>
								{organization.slug}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN}/slugify-project-name
							</Label>
							<LabelledInput label={"Description"} id="description" />
							<OptionField
								title="Publicably visible"
								description="Public projects are visible to everyone while still keeping certain content restricted based on permissions. Private projects are only visible to members you invite, and only useful if you never plan to have external access."
								customSide={<Switch defaultChecked />}
							/>
						</div>
					</div>
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="outline">
							Cancel
						</Button>
					</DialogClose>
					<Button type="button" variant="success">
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
