"use client";

import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { ImageCrop } from "@repo/ui/components/image-crop";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlusIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { useLayoutData } from "@/app/admin/Context";
import { useCharacterLimit } from "@/app/hooks/use-character-limit";
import { type UpdateOrganizationData, updateOrganizationAction } from "@/app/lib/updateOrganization";

interface FileWithPreview {
	id: string;
	name: string;
	size: number;
	type: string;
	preview: string;
}

interface Organization {
	id: string;
	name: string;
	slug: string;
	logo?: string | null;
	bannerImg?: string | null;
	metadata?: Record<string, unknown>;
}

interface UpdateOrgDialogProps {
	organization: Organization;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function UpdateOrgDialog({ organization, isOpen, onOpenChange }: UpdateOrgDialogProps) {
	const id = useId();
	const queryClient = useQueryClient();
	const { setOrg, organization: currentOrg } = useLayoutData();

	// Form state
	const [name, setName] = useState(organization.name);
	const [slug, setSlug] = useState(organization.slug);

	const maxLength = 180;
	const {
		value: description,
		characterCount,
		handleChange: handleDescriptionChange,
	} = useCharacterLimit({
		maxLength,
		initialValue: (organization.metadata?.description as string) || "",
	});

	// Initialize with existing logo if present
	const initialLogoFiles: FileWithPreview[] = organization.logo
		? [
				{
					name: "current-logo.jpg",
					size: 0,
					type: "image/jpeg",
					id: "current-logo",
					preview: organization.logo,
				},
			]
		: [];

	// Initialize with existing banner if present
	const initialBannerFiles: FileWithPreview[] = organization.bannerImg
		? [
				{
					name: "current-banner.jpg",
					size: 0,
					type: "image/jpeg",
					id: "current-banner",
					preview: organization.bannerImg,
				},
			]
		: [];

	// State for files since we're handling it manually
	const [logoFiles, setLogoFiles] = useState<FileWithPreview[]>(initialLogoFiles);
	const [bannerFiles, setBannerFiles] = useState<FileWithPreview[]>(initialBannerFiles);

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

	// Create refs for the file inputs
	const logoFileInputRef = useRef<HTMLInputElement>(null);
	const bannerFileInputRef = useRef<HTMLInputElement>(null);

	// Override openFileDialog to use our refs
	const handleOpenLogoDialog = () => {
		logoFileInputRef.current?.click();
	};

	const handleOpenBannerDialog = () => {
		bannerFileInputRef.current?.click();
	};

	// Handle file change manually for logo
	const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = e.target.files;
		if (selectedFiles && selectedFiles.length > 0) {
			const file = selectedFiles[0];
			if (!file) return;

			// Validate file type and size
			if (!file.type.startsWith("image/")) {
				toast.error("Please select an image file");
				return;
			}
			if (file.size > 10 * 1024 * 1024) {
				// 10MB limit
				toast.error("File size must be less than 10MB");
				return;
			}

			// Create preview URL and start cropping
			const previewUrl = URL.createObjectURL(file);
			setCropModalState({
				isOpen: true,
				src: previewUrl,
				type: "logo",
			});
		}
	};

	// Handle file change manually for banner
	const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = e.target.files;
		if (selectedFiles && selectedFiles.length > 0) {
			const file = selectedFiles[0];
			if (!file) return;

			// Validate file type and size
			if (!file.type.startsWith("image/")) {
				toast.error("Please select an image file");
				return;
			}
			if (file.size > 10 * 1024 * 1024) {
				// 10MB limit
				toast.error("File size must be less than 10MB");
				return;
			}

			// Create preview URL and start cropping
			const previewUrl = URL.createObjectURL(file);
			setCropModalState({
				isOpen: true,
				src: previewUrl,
				type: "banner",
			});
		}
	};

	// Handle crop completion
	const handleCropComplete = (croppedImageBase64: string) => {
		const newFile: FileWithPreview = {
			id: Math.random().toString(36).substring(2, 15),
			name: cropModalState.type === "logo" ? "cropped-logo.jpg" : "cropped-banner.jpg",
			size: 0,
			type: "image/jpeg",
			preview: croppedImageBase64,
		};

		if (cropModalState.type === "logo") {
			setLogoFiles([newFile]);
		} else {
			setBannerFiles([newFile]);
		}

		// Clean up the original preview URL
		URL.revokeObjectURL(cropModalState.src);
		setCropModalState({ isOpen: false, src: "", type: "logo" });
	};

	// Remove file functions
	const removeLogoFile = (id: string) => {
		setLogoFiles((prev) => {
			const fileToRemove = prev.find((f) => f.id === id);
			if (fileToRemove?.preview && fileToRemove.id !== "current-logo") {
				URL.revokeObjectURL(fileToRemove.preview);
			}
			return prev.filter((f) => f.id !== id);
		});
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

	// Mutation for updating organization
	const updateMutation = useMutation({
		mutationFn: async (data: UpdateOrganizationData) => {
			const result = await updateOrganizationAction(organization.id, data);
			if (!result.success) {
				throw new Error(result.error);
			}
			return result.data;
		},
		onSuccess: () => {
			toast.success("Organization updated successfully");

			// Update the organization in context with full structure
			if (currentOrg) {
				const updatedOrg = {
					...currentOrg,
					name,
					slug,
					logo: logoFiles[0]?.preview || null,
					bannerImg: bannerFiles[0]?.preview || null,
					metadata: { ...organization.metadata, description },
				};
				setOrg(updatedOrg);
			}

			// Invalidate relevant queries
			queryClient.invalidateQueries({ queryKey: ["organization"] });

			onOpenChange(false);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update organization");
		},
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!name.trim() || !slug.trim()) {
			toast.error("Name and slug are required");
			return;
		}

		try {
			let logoBase64: string | undefined;
			let bannerBase64: string | undefined;

			// Convert logo file to base64 if a new file is uploaded
			if (logoFiles[0] && logoFiles[0].id !== "current-logo") {
				logoBase64 = logoFiles[0].preview; // Already base64 from cropping
			} else if (logoFiles[0] && logoFiles[0].id === "current-logo") {
				// Keep existing logo
				logoBase64 = organization.logo || undefined;
			}

			// Convert banner file to base64 if a new file is uploaded
			if (bannerFiles[0] && bannerFiles[0].id !== "current-banner") {
				bannerBase64 = bannerFiles[0].preview; // Already base64 from cropping
			} else if (bannerFiles[0] && bannerFiles[0].id === "current-banner") {
				// Keep existing banner
				bannerBase64 = organization.bannerImg || undefined;
			}

			const updateData: UpdateOrganizationData = {
				name: name.trim(),
				slug: slug.trim(),
				logo: logoBase64,
				bannerImg: bannerBase64,
				metadata: {
					...organization.metadata,
					description: description.trim() || undefined,
				},
			};

			updateMutation.mutate(updateData);
		} catch {
			toast.error("Failed to process images");
		}
	};

	const currentLogoImage = logoFiles[0]?.preview || null;
	const currentBannerImage = bannerFiles[0]?.preview || null;

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="flex flex-col gap-0 overflow-y-visible max-h-[90vh] p-0 sm:max-w-lg [&>button:last-child]:top-3.5">
				<DialogHeader className="contents space-y-0 text-left">
					<DialogTitle className="border-b px-6 py-4 text-base">{organization.name}</DialogTitle>
				</DialogHeader>
				<DialogDescription className="sr-only">
					Make changes to your organization here. You can change the banner, logo, name, slug, and description.
				</DialogDescription>
				<div className="overflow-y-scroll h-full">
					<BannerUpload
						currentImage={currentBannerImage}
						openFileDialog={handleOpenBannerDialog}
						removeFile={removeBannerFile}
						files={bannerFiles}
					/>
					<LogoUpload
						currentImage={currentLogoImage}
						openFileDialog={handleOpenLogoDialog}
						removeFile={removeLogoFile}
						files={logoFiles}
					/>
					<div className="px-6 pt-4 pb-6">
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor={`${id}-name`}>Name</Label>
								<Input
									id={`${id}-name`}
									placeholder="My Organization"
									value={name}
									onChange={(e) => setName(e.target.value)}
									type="text"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`${id}-slug`}>Slug</Label>
								{/* <div className="flex rounded-md shadow-xs"> */}
								{/* <span className="border-input bg-background text-muted-foreground -z-10 inline-flex items-center rounded-s-md border px-3 text-sm">
										/org/
									</span> */}
								<Input
									id={`${id}-slug`}
									// className="-ms-px rounded-s-none shadow-none"
									placeholder="my-organization"
									value={slug}
									onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
									type="text"
									required
								/>
								{/* </div> */}
							</div>
							<div className="space-y-2">
								<Label htmlFor={`${id}-description`}>Description</Label>
								<Textarea
									id={`${id}-description`}
									placeholder="Write a few sentences about your organization"
									value={description}
									maxLength={maxLength}
									onChange={handleDescriptionChange}
									aria-describedby={`${id}-description-help`}
								/>
								<p
									id={`${id}-description-help`}
									className="text-muted-foreground mt-2 text-right text-xs"
									aria-live="polite"
								>
									<span className="tabular-nums">{maxLength - characterCount}</span> characters left
								</p>
							</div>
						</form>
					</div>
				</div>
				<DialogFooter className="border-t px-6 py-4">
					<DialogClose asChild>
						<Button type="button" variant="outline" disabled={updateMutation.isPending}>
							Cancel
						</Button>
					</DialogClose>
					<Button type="button" onClick={handleSubmit} disabled={updateMutation.isPending}>
						{updateMutation.isPending ? "Saving..." : "Save changes"}
					</Button>
				</DialogFooter>
			</DialogContent>

			{/* Image Crop Modal */}
			<ImageCrop
				src={cropModalState.src}
				aspectRatio={cropModalState.type === "logo" ? 1 : 16 / 9}
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

			{/* File inputs */}
			<input
				ref={logoFileInputRef}
				type="file"
				accept="image/*"
				onChange={handleLogoFileChange}
				style={{ display: "none" }}
			/>
			<input
				ref={bannerFileInputRef}
				type="file"
				accept="image/*"
				onChange={handleBannerFileChange}
				style={{ display: "none" }}
			/>
		</Dialog>
	);
}

function BannerUpload({
	currentImage,
	openFileDialog,
	removeFile,
	files,
}: {
	currentImage: string | null;
	openFileDialog: () => void;
	removeFile: (id: string) => void;
	files: FileWithPreview[];
}) {
	return (
		<div className="w-full aspect-video">
			<div className="bg-muted relative flex size-full items-center justify-center overflow-hidden">
				{currentImage && (
					<Image
						className="size-full object-cover"
						src={currentImage}
						alt="Organization banner"
						width={512}
						height={128}
					/>
				)}
				<div className="absolute inset-0 flex items-center justify-center gap-2">
					<button
						type="button"
						className="focus-visible:border-ring focus-visible:ring-ring/50 z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px]"
						onClick={openFileDialog}
						aria-label={currentImage ? "Change banner" : "Upload banner"}
					>
						<ImagePlusIcon size={16} aria-hidden="true" />
					</button>
					{currentImage && (
						<button
							type="button"
							className="focus-visible:border-ring focus-visible:ring-ring/50 z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px]"
							onClick={() => files[0]?.id && removeFile(files[0].id)}
							aria-label="Remove banner"
						>
							<XIcon size={16} aria-hidden="true" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

function LogoUpload({
	currentImage,
	openFileDialog,
	removeFile,
	files,
}: {
	currentImage: string | null;
	openFileDialog: () => void;
	removeFile: (id: string) => void;
	files: FileWithPreview[];
}) {
	return (
		<div className="-mt-10 px-6">
			<div className="border-background bg-muted relative flex size-20 items-center justify-center overflow-hidden rounded-full border-4 shadow-xs shadow-black/10">
				{currentImage && (
					<Image
						src={currentImage}
						className="size-full object-cover"
						width={80}
						height={80}
						alt="Organization logo"
					/>
				)}
				<button
					type="button"
					className="focus-visible:border-ring focus-visible:ring-ring/50 absolute flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px]"
					onClick={openFileDialog}
					aria-label="Change organization logo"
				>
					<ImagePlusIcon size={16} aria-hidden="true" />
				</button>
				{currentImage && (
					<button
						type="button"
						className="focus-visible:border-ring focus-visible:ring-ring/50 absolute -top-2 -right-2 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px]"
						onClick={() => files[0]?.id && removeFile(files[0].id)}
						aria-label="Remove logo"
					>
						<XIcon size={12} aria-hidden="true" />
					</button>
				)}
			</div>
		</div>
	);
}
