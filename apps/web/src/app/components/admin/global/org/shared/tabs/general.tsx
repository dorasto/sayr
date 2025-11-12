"use client";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import Clipboard from "@repo/ui/components/doras-ui/clipboard";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
} from "@repo/ui/components/input-group";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { IconBuilding, IconCheck, IconCopy, IconDeviceFloppy, IconInfoCircle, IconLink } from "@tabler/icons-react";
import TextareaAutosize from "react-textarea-autosize";
import LogoUpload from "../../management/update/general/logo-upload";

interface Props {
	organization: schema.OrganizationWithMembers;
}

export default function GeneralTab({ organization }: Props) {
	return (
		<div className="p-4 flex flex-col gap-2">
			<div className="bg-accent p-2 rounded flex flex-col gap-1 group/name">
				<div className="flex items-center gap-2 pl-3">
					{/* All these will be saved onBlur or however you want to handle it. Not indivudual save buttons */}
					<Label className="inline-flex items-center">Name</Label>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								className="rounded-full p-0 h-auto w-auto group-hover/name:opacity-100 opacity-0 transition-all"
								variant={"ghost"}
								size="icon"
							>
								<IconInfoCircle />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Choose your organization name</TooltipContent>
					</Tooltip>
				</div>
				<InputGroup className="focus-within:bg-card/50 bg-accent border-0 shadow-none transition-all">
					<InputGroupAddon align="inline-start" className="">
						<IconBuilding />
					</InputGroupAddon>
					<InputGroupInput placeholder="Organization name" value={organization.name} />
					{/* This only appears for a few seconds after an update. So once "saved"; wait and dismiss/conditional render */}
					<InputGroupAddon align="inline-end">
						<IconCheck />
					</InputGroupAddon>
				</InputGroup>
			</div>
			<div className="bg-accent p-2 rounded flex flex-col gap-1 group/slug">
				<div className="flex items-center gap-2 pl-3">
					<Label className="inline-flex items-center">Slug</Label>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								className="rounded-full p-0 h-auto w-auto group-hover/slug:opacity-100 opacity-0 transition-all"
								variant={"ghost"}
								size="icon"
							>
								<IconInfoCircle />
							</Button>
						</TooltipTrigger>
						<TooltipContent>The URL for where your organization is found</TooltipContent>
					</Tooltip>
				</div>
				<InputGroup className="focus-within:bg-card/50 bg-accent border-0 shadow-none transition-all group/sluginput">
					<InputGroupAddon align="inline-start">
						<IconLink />
					</InputGroupAddon>
					<InputGroupInput placeholder="my-org" value={organization.slug} />

					<InputGroupAddon align="inline-end">
						<InputGroupText className="">.sayr.io</InputGroupText>
						<Clipboard textToCopy={`https://${organization.slug}.sayr.io`} className="">
							<InputGroupButton>
								<IconCopy />
							</InputGroupButton>
						</Clipboard>
						<Separator orientation="vertical" className="bg-muted-foreground h-4" />
						{/* This won't be on blur and will require a save. So you click save, the icon floppy turns into a IconLoader2  and then transforms into the checkmark when saved*/}
						<InputGroupButton>
							<IconDeviceFloppy />
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</div>
			<div className="bg-accent p-2 rounded flex flex-col gap-1 group/description">
				<div className="flex items-center gap-2 pl-3">
					<Label className="inline-flex items-center">Description</Label>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								className="rounded-full p-0 h-auto w-auto group-hover/description:opacity-100 opacity-0 transition-all"
								variant={"ghost"}
								size="icon"
							>
								<IconInfoCircle />
							</Button>
						</TooltipTrigger>
						<TooltipContent>What describes your organization?</TooltipContent>
					</Tooltip>
				</div>
				<InputGroup className="focus-within:bg-card/50 bg-accent border-0 shadow-none transition-all">
					<TextareaAutosize
						data-slot="input-group-control"
						className="flex field-sizing-content min-h-16 max-h-40 w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-base transition-[color,box-shadow] outline-none md:text-sm"
						placeholder="Describe your organization..."
						value={organization.description ? organization.description : ""}
					/>
					{/* This only appears for a few seconds after an update. So once "saved"; wait and dismiss/conditional render */}
					<InputGroupAddon align="block-end">
						<IconCheck className="ml-auto" />
					</InputGroupAddon>
				</InputGroup>
			</div>
		</div>
	);
}
