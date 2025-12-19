import { Button } from "@repo/ui/components/button";
import {
	Tabs,
	TabsList,
	TabsPanel,
	TabsTab,
} from "@repo/ui/components/cossui/tabs";
import {
	Tile,
	TileAction,
	TileDescription,
	TileHeader,
	TileIcon,
	TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@repo/ui/components/input-group";
import { Label } from "@repo/ui/components/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import { Separator } from "@repo/ui/components/separator";
import { Switch } from "@repo/ui/components/switch";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
import {
	IconCheck,
	IconCircleFilled,
	IconProgress,
	IconSearch,
} from "@tabler/icons-react";
import IconPicker from "@/components/generic/icon-picker";
import RenderIcon from "@/components/generic/RenderIcon";
import { cn } from "@/lib/utils";

export default function SettingsOrganizationPageTeamSettings() {
	return (
		<Tabs defaultValue="settings" className={"max-w-prose w-full min-w-full"}>
			<div className="w-full min-w-full border-b">
				<TabsList variant="underline" className={""}>
					<TabsTab value="settings">General settings</TabsTab>
					<TabsTab value="permissions">Permissions</TabsTab>
					<TabsTab value="members">Members</TabsTab>
				</TabsList>
			</div>
			<TabsPanel value="settings" className={" w-full"}>
				<div className="bg-card rounded-lg flex flex-col gap-1 p-3">
					<Label>Team name</Label>
					<InputGroup className="border-transparent focus-within:shadow-2xl transition-all focus-within:bg-accent">
						<InputGroupAddon align="inline-start" className="h-full">
							<InputGroupButton asChild>
								<Popover modal>
									<PopoverTrigger asChild>
										<Button
											variant={"accent"}
											className="h-auto w-auto p-0 border-transparent rounded-lg overflow-hidden"
										>
											<RenderIcon
												iconName={"IconCircleFilled"}
												// color={color.hsla}
												button
												className={cn("size-8 [&_svg]:size-5")}
											/>
										</Button>
									</PopoverTrigger>
									<PopoverContent className="p-0 w-64 md:w-96">
										{/* <div className="flex flex-col gap-3">
									<div className="p-3">
										<ColorPickerCustom onChange={setColor} defaultValue={color.hex} height={100} />
									</div>
									<div className="px-3">
										<IconPicker
											value={icon}
											update={(value: string): void => {
												setIcon(value);
											}}
										/>
									</div>
								</div> */}
									</PopoverContent>
								</Popover>
							</InputGroupButton>
						</InputGroupAddon>
						<InputGroupInput placeholder="Team name" className="" />
					</InputGroup>
					<Label>Description</Label>
					<InputGroup className="border-transparent focus-within:shadow-2xl transition-all focus-within:bg-accent">
						<InputGroupInput placeholder="Description" className="" />
					</InputGroup>
				</div>
			</TabsPanel>
			<TabsPanel value="permissions" className={"w-full"}>
				<div className="rounded-lg flex flex-col gap-3">
					<Tile
						variant={"transparent"}
						className="md:w-full items-start bg-destructive/10 has-data-[state=checked]:bg-primary/5"
					>
						<TileHeader className="w-full">
							<TileTitle>Administrator</TileTitle>
							<TileDescription>
								Overrides organization-wide settings, granting full access to
								all aspects of the organization, excluding billing. Any member
								of this team will become an organization admin.
							</TileDescription>
						</TileHeader>
						<TileAction>
							<Switch />
						</TileAction>
					</Tile>

					<Separator />
					<Tile
						className="md:w-full items-start has-data-[state=checked]:bg-primary/5"
						variant={"transparent"}
					>
						<TileHeader className="w-full">
							<TileTitle>Members</TileTitle>
							<TileDescription>
								Can invite, remove, and manage members of the organization.
							</TileDescription>
						</TileHeader>
						<TileAction>
							<Switch />
						</TileAction>
					</Tile>
					<Separator />
					<Tile
						className="md:w-full items-start has-data-[state=checked]:bg-primary/5"
						variant={"transparent"}
					>
						<TileHeader className="w-full">
							<TileTitle>Teams</TileTitle>
							<TileDescription>
								Can create, edit, and delete teams within the organization.
							</TileDescription>
						</TileHeader>
						<TileAction>
							<Switch />
						</TileAction>
					</Tile>
					<Separator />
					<Tile
						className="md:w-full items-start has-data-[state=checked]:bg-primary/5"
						variant={"transparent"}
					>
						<TileHeader className="w-full">
							<TileTitle>Categories</TileTitle>
							<TileDescription>
								Allows creating, editing, and deleting project categories within
								the organization.
							</TileDescription>
						</TileHeader>
						<TileAction>
							<Switch />
						</TileAction>
					</Tile>
					<Separator />
					<Tile
						className="md:w-full items-start has-data-[state=checked]:bg-primary/5"
						variant={"transparent"}
					>
						<TileHeader className="w-full">
							<TileTitle>Labels</TileTitle>
							<TileDescription>
								Allows creating, editing, and deleting labels.
							</TileDescription>
						</TileHeader>
						<TileAction>
							<Switch />
						</TileAction>
					</Tile>
					<Separator />
					<Tile
						className="md:w-full items-start has-data-[state=checked]:bg-primary/5"
						variant={"transparent"}
					>
						<TileHeader className="w-full">
							<TileTitle>Categories</TileTitle>
							<TileDescription>
								Allows creating, editing, and deleting project categories within
								the organization.
							</TileDescription>
						</TileHeader>
						<TileAction>
							<Switch />
						</TileAction>
					</Tile>
				</div>
			</TabsPanel>
			<TabsPanel value="members">Tab 3 content</TabsPanel>
		</Tabs>
	);
}
