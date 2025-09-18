"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import ColorPicker from "@repo/ui/components/tomui/color-picker";
import { TabbedDialogFooter } from "@repo/ui/components/tomui/tabbed-dialog";
import { cn } from "@repo/ui/lib/utils";
import { IconCircleFilled } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";
import { type UpdateOrganizationData, updateOrganizationAction, uploadOrganizationBanner } from "@/app/lib/fetches";
import { handleFileValidation } from "../utils/file-validation";
import type { FileWithPreview } from "../utils/types";
import BannerUpload from "./banner-upload";

export interface DesignRef {
	saveBanner: () => void;
	isSubmitting: boolean;
	setCroppedBanner: (croppedImageBase64: string) => void;
}

interface DesignProps {
	organization: schema.OrganizationWithMembers;
	onBannerSaved?: () => void; // Callback when banner is saved successfully
	onRequestCrop?: (src: string, type: "banner") => void;
}

const Design = forwardRef<DesignRef, DesignProps>(({ organization, onBannerSaved, onRequestCrop }, ref) => {
	const [primary] = useState("#ff0000");
	const bannerFileInputRef = useRef<HTMLInputElement>(null);

	// Initialize with existing banner if present
	const initialBannerFiles: FileWithPreview[] = organization.bannerImg
		? [
				{
					name: "current-banner.webp",
					size: 0,
					type: "image/webp",
					id: "current-banner",
					preview: organization.bannerImg,
				},
			]
		: [];

	// Banner file state
	const [bannerFiles, setBannerFiles] = useState<FileWithPreview[]>(initialBannerFiles);

	// Handle banner file upload
	const handleBannerUpload = () => {
		bannerFileInputRef.current?.click();
	};

	const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = e.target.files;
		if (selectedFiles && selectedFiles.length > 0) {
			const file = selectedFiles[0];
			if (!file) return;

			if (!handleFileValidation(file)) return;

			// Create preview URL and request cropping
			const previewUrl = URL.createObjectURL(file);
			onRequestCrop?.(previewUrl, "banner");
		}
	};

	const removeBannerFile = (id: string) => {
		setBannerFiles((prev) => {
			const fileToRemove = prev.find((f) => f.id === id);
			if (fileToRemove?.preview && fileToRemove.id !== "current-banner") {
				URL.revokeObjectURL(fileToRemove.preview);
			}
			return prev.filter((f) => f.id !== id);
		});
	};

	// Add method to accept cropped banner from parent
	const setCroppedBanner = useCallback((croppedImageBase64: string) => {
		const newFile: FileWithPreview = {
			id: Math.random().toString(36).substring(2, 15),
			name: "cropped-banner.webp",
			size: 0,
			type: "image/webp",
			preview: croppedImageBase64,
		};
		setBannerFiles([newFile]);
	}, []);

	const currentBannerImage = bannerFiles[0]?.preview || null;

	// Mutation for saving banner
	const bannerMutation = useMutation({
		mutationFn: async (bannerBase64: string) => {
			const updateData: Partial<UpdateOrganizationData> = {
				bannerImg: bannerBase64,
			};
			const result = await updateOrganizationAction(organization.id, updateData as UpdateOrganizationData, "");
			if (!result.success) {
				throw new Error(result.error);
			}
			return result.data;
		},
		onSuccess: () => {
			toast.success("Banner updated successfully");
			onBannerSaved?.();
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update banner");
		},
	});

	const saveBanner = useCallback(async () => {
		try {
			// 🗑 Remove banner if no files left
			if (bannerFiles.length === 0) {
				bannerMutation.mutate(""); // send empty string to clear
				return;
			}

			if (!bannerFiles[0]) {
				toast.error("No banner to save");
				return;
			}

			// 🖼 If new banner is uploaded
			if (bannerFiles[0].id !== "current-banner") {
				const res = await fetch(bannerFiles[0].preview);
				const blob = await res.blob();
				const file = new File([blob], bannerFiles[0].name, { type: blob.type });

				const uploadResult = await uploadOrganizationBanner(organization.id, file, organization.bannerImg);

				// Now update DB value with the banner CDN URL
				bannerMutation.mutate(uploadResult.image);
				toast.success("Banner updated");
			} else {
				// No changes → keep existing
				toast.info("No changes to save");
			}
		} catch (error) {
			console.error("🚀 ~ saveBanner ~ error:", error);
			toast.error("Failed to upload banner");
		}
	}, [bannerFiles, bannerMutation, organization.id, organization.bannerImg]);
	// Expose saveBanner function to parent via ref
	useImperativeHandle(ref, () => ({
		saveBanner,
		isSubmitting: bannerMutation.isPending,
		setCroppedBanner,
	}));

	// Available colours:
	// Background, Foreground, Primary, Secondary
	// Based off these, we'll generate shades and others provided context. For example, for a card background we can calculate
	// a shade based off the background colour potentially.
	// We will provide very minimal styling options, as the goal is to have a consistent design system.
	// We'll also likely have some "defaults" that can be reset to.
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium mb-4">Banner</h3>
				<BannerUpload
					currentImage={currentBannerImage}
					openFileDialog={handleBannerUpload}
					removeFile={removeBannerFile}
					files={bannerFiles}
				/>
			</div>

			<div>
				<h3 className="text-lg font-medium mb-4">Colors</h3>
				<div className="flex flex-col gap-3 w-fit">
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" className="justify-start">
								<IconCircleFilled className={cn(`text-[${primary}]`)} />
								Background
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
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" className="justify-start">
								<IconCircleFilled className={cn(`text-[${primary}]`)} />
								Foreground
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
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" className="justify-start">
								<IconCircleFilled className={cn(`text-[${primary}]`)} />
								Primary
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
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" className="justify-start">
								<IconCircleFilled className={cn(`text-[${primary}]`)} />
								Secondary
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
			</div>

			{/* Banner file input */}
			<input
				ref={bannerFileInputRef}
				type="file"
				accept="image/*"
				onChange={handleBannerFileChange}
				style={{ display: "none" }}
			/>
		</div>
	);
});

Design.displayName = "Design";

export default Design;

// Footer component for the Design tab - now handles banner saving
export function DesignFooter({
	designRef,
	onCloseDialog,
}: {
	designRef: React.RefObject<DesignRef | null>;
	onCloseDialog: () => void;
}) {
	const handleSave = () => {
		designRef.current?.saveBanner();
	};

	return (
		<TabbedDialogFooter
			onCancel={onCloseDialog}
			onSubmit={handleSave}
			isSubmitting={designRef.current?.isSubmitting || false}
			submitDisabled={false} // Could check if there are changes to save
			classNameSuccess="hover:border-success/60"
		/>
	);
}
