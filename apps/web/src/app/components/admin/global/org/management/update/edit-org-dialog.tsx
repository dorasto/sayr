"use client";

import type { schema } from "@repo/database";
import { ImageCrop } from "@repo/ui/components/image-crop";
import { TabbedDialog, TabPanel } from "@repo/ui/components/tomui/tabbed-dialog";
import { IconBrush, IconHome, IconUsers } from "@tabler/icons-react";
import { useRef, useState } from "react";
import Design, { DesignFooter, type DesignRef } from "./design";
import GeneralSettings, { GeneralSettingsFooter, type GeneralSettingsRef } from "./general";
import OrganizationMembers from "./members";

interface UpdateOrgDialogProps {
	organization: schema.OrganizationWithMembers;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function UpdateOrgDialog({ organization, isOpen, onOpenChange }: UpdateOrgDialogProps) {
	// Refs for communicating with child components
	const generalSettingsRef = useRef<GeneralSettingsRef>(null);
	const designRef = useRef<DesignRef>(null);

	// Cropping state
	const [cropModalState, setCropModalState] = useState<{
		isOpen: boolean;
		src: string;
		type: "logo" | "banner";
	}>({
		isOpen: false,
		src: "",
		type: "logo",
	});

	// Handle crop requests from components
	const handleCropRequest = (src: string, type: "logo" | "banner") => {
		setCropModalState({
			isOpen: true,
			src,
			type,
		});
	};

	// Handle crop completion
	const handleCropComplete = (croppedImageBase64: string) => {
		if (cropModalState.type === "logo") {
			generalSettingsRef.current?.setCroppedLogo(croppedImageBase64);
		} else {
			designRef.current?.setCroppedBanner(croppedImageBase64);
		}

		// Clean up the original preview URL
		URL.revokeObjectURL(cropModalState.src);
		setCropModalState({ isOpen: false, src: "", type: "logo" });
	};

	const tabs = [
		{
			name: "Organization",
			items: [
				{
					id: "general",
					label: "General",
					icon: <IconHome size={16} aria-hidden="true" />,
					footer: (
						<GeneralSettingsFooter
							generalSettingsRef={generalSettingsRef}
							onCloseDialog={() => onOpenChange(false)}
						/>
					),
				},
				{
					id: "design",
					label: "Design",
					icon: <IconBrush size={16} aria-hidden="true" />,
					footer: <DesignFooter designRef={designRef} onCloseDialog={() => onOpenChange(false)} />,
				},
				{
					id: "members",
					label: "Members",
					icon: <IconUsers size={16} aria-hidden="true" />,
				},
			],
		},
	];

	return (
		<>
			<TabbedDialog
				isOpen={isOpen}
				onOpenChange={onOpenChange}
				title={organization.name}
				description="Make changes to your organization here. You can change the banner, logo, name, slug, and description."
				groupedTabs={tabs}
				defaultTab="general"
				layout="side"
				size="xl"
			>
				<TabPanel tabId="general">
					<GeneralSettings
						ref={generalSettingsRef}
						organization={organization}
						onCloseDialog={() => onOpenChange(false)}
						onRequestCrop={handleCropRequest}
					/>
				</TabPanel>
				<TabPanel tabId={"design"}>
					<Design ref={designRef} organization={organization} onRequestCrop={handleCropRequest} />
				</TabPanel>
				<TabPanel tabId={"members"}>
					{/** biome-ignore lint/suspicious/noExplicitAny: <will look into this> */}
					<OrganizationMembers members={organization.members as any} />
				</TabPanel>
			</TabbedDialog>

			{/* Image Crop Modal */}
			<ImageCrop
				src={cropModalState.src}
				aspectRatio={cropModalState.type === "logo" ? 1 : 21 / 9}
				isOpen={cropModalState.isOpen}
				onOpenChange={(open) => {
					if (!open) {
						URL.revokeObjectURL(cropModalState.src);
						setCropModalState({ isOpen: false, src: "", type: "logo" });
					}
				}}
				onCropComplete={handleCropComplete}
				title={`Crop ${cropModalState.type === "logo" ? "Logo" : "Banner"}`}
				description={`Adjust the crop area to get the perfect ${cropModalState.type}.`}
			/>
		</>
	);
}
