"use client";

import { ImageCrop } from "@repo/ui/components/image-crop";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { TabbedDialog, TabbedDialogFooter, TabPanel } from "@repo/ui/components/tomui/tabbed-dialog";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconHome, IconUsers } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlusIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { useLayoutData } from "@/app/admin/Context";
import { useCharacterLimit } from "@/app/hooks/use-character-limit";
import { type UpdateOrganizationData, updateOrganizationAction } from "@/app/lib/test";
import OrganizationMembers from "./members";

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
	description?: string;
}

interface UpdateOrgDialogProps {
	organization: Organization;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function UpdateOrgDialog({ organization, isOpen, onOpenChange }: UpdateOrgDialogProps) {
	const { value: WSClientId } = useStateManagement<string>("ws-clientId", "");
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
		initialValue: (organization?.description as string) || "",
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
			const result = await updateOrganizationAction(organization.id, data, WSClientId);
			if (!result.success) {
				throw new Error(result.error);
			}
			return result.data;
		},
		onSuccess: (data) => {
			toast.success("Organization updated successfully");

			// Update the organization in context with full structure
			if (currentOrg) {
				const updatedOrg = {
					...currentOrg,
					data,
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

	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();

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
				description: description.trim(),
			};

			updateMutation.mutate(updateData);
		} catch (error) {
			console.error("🚀 ~ handleSubmit ~ error:", error);
			toast.error("Failed to process images");
		}
	};

	const currentLogoImage = logoFiles[0]?.preview || null;
	const currentBannerImage = bannerFiles[0]?.preview || null;

	const tabs = [
		{
			id: "general",
			label: "General",
			icon: <IconHome className="-ms-0.5 me-1.5 opacity-60" size={16} aria-hidden="true" />,
			footer: (
				<TabbedDialogFooter
					onCancel={() => onOpenChange(false)}
					onSubmit={handleSubmit}
					isSubmitting={updateMutation.isPending}
					submitDisabled={!name.trim() || !slug.trim()}
					classNameSuccess="hover:border-success/60"
				/>
			),
		},
		{
			id: "members",
			label: "Members",
			icon: <IconUsers className="-ms-0.5 me-1.5 opacity-60" size={16} aria-hidden="true" />,
		},
	];

	return (
		<>
			<TabbedDialog
				isOpen={isOpen}
				onOpenChange={onOpenChange}
				title={organization.name}
				description="Make changes to your organization here. You can change the banner, logo, name, slug, and description."
				tabs={tabs}
				defaultTab="general"
				size="xl"
			>
				<TabPanel tabId="general">
					<BannerUpload
						currentImage={currentBannerImage}
						openFileDialog={handleOpenBannerDialog}
						removeFile={removeBannerFile}
						files={bannerFiles}
					/>
					<div className="">
						<form onSubmit={handleSubmit} className="space-y-3">
							<div className="space-y-3">
								<div className="flex gap-3 items-center w-full">
									<LogoUpload
										currentImage={currentLogoImage}
										openFileDialog={handleOpenLogoDialog}
										removeFile={removeLogoFile}
										files={logoFiles}
									/>
									<div className="flex flex-col gap-3 w-full">
										<div className="group relative">
											<Label
												htmlFor={`${id}-name`}
												className="origin-start text-muted-foreground/70 group-focus-within:text-foreground has-[+input:not(:placeholder-shown)]:text-foreground absolute top-1/2 block -translate-y-1/2 cursor-text px-1 text-sm transition-all group-focus-within:pointer-events-none group-focus-within:top-0 group-focus-within:cursor-default group-focus-within:text-xs group-focus-within:font-medium has-[+input:not(:placeholder-shown)]:pointer-events-none has-[+input:not(:placeholder-shown)]:top-0 has-[+input:not(:placeholder-shown)]:cursor-default has-[+input:not(:placeholder-shown)]:text-xs has-[+input:not(:placeholder-shown)]:font-medium"
											>
												<span className="bg-popover inline-flex px-2">Display name</span>
											</Label>
											<Input
												id={`${id}-name`}
												type="text"
												placeholder=" "
												value={name}
												onChange={(e) => setName(e.target.value)}
												required
												className="bg-popover"
											/>
										</div>
										<div className="group relative">
											<Label
												htmlFor={`${id}-slug`}
												className="origin-start text-muted-foreground/70 group-focus-within:text-foreground has-[+input:not(:placeholder-shown)]:text-foreground absolute top-1/2 block -translate-y-1/2 cursor-text px-1 text-sm transition-all group-focus-within:pointer-events-none group-focus-within:top-0 group-focus-within:cursor-default group-focus-within:text-xs group-focus-within:font-medium has-[+input:not(:placeholder-shown)]:pointer-events-none has-[+input:not(:placeholder-shown)]:top-0 has-[+input:not(:placeholder-shown)]:cursor-default has-[+input:not(:placeholder-shown)]:text-xs has-[+input:not(:placeholder-shown)]:font-medium"
											>
												<span className="bg-popover inline-flex px-2">Slug</span>
											</Label>
											<Input
												id={`${id}-slug`}
												type="text"
												placeholder=" "
												value={slug}
												onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
												required
												className="bg-popover"
											/>
										</div>
									</div>
								</div>
							</div>
							<div className="group relative">
								<Label
									htmlFor={`${id}-description`}
									className="origin-start text-muted-foreground/70 group-focus-within:text-foreground has-[+textarea:not(:placeholder-shown)]:text-foreground has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 has-aria-invalid:border-destructive absolute top-0 block translate-y-2 cursor-text px-1 text-sm transition-all group-focus-within:pointer-events-none group-focus-within:-translate-y-1/2 group-focus-within:cursor-default group-focus-within:text-xs group-focus-within:font-medium has-[+textarea:not(:placeholder-shown)]:pointer-events-none has-[+textarea:not(:placeholder-shown)]:-translate-y-1/2 has-[+textarea:not(:placeholder-shown)]:cursor-default has-[+textarea:not(:placeholder-shown)]:text-xs has-[+textarea:not(:placeholder-shown)]:font-medium"
								>
									<span className="bg-popover inline-flex px-2">Description</span>
								</Label>
								<Textarea
									id={id}
									value={description}
									maxLength={maxLength}
									onChange={handleDescriptionChange}
									aria-describedby={`${id}-description-help`}
									className="resize-none bg-popover"
									placeholder=" "
								/>
								<p
									id={`${id}-description-help`}
									className="text-muted-foreground mt-2 text-right text-xs"
									aria-live="polite"
								>
									<span className="tabular-nums">{maxLength - characterCount}</span> characters left
								</p>
							</div>
							{/* <div className="mt-auto flex gap-2 ml-auto">
								<TabbedDialogFooter
									onCancel={() => onOpenChange(false)}
									onSubmit={handleSubmit}
									isSubmitting={updateMutation.isPending}
									submitDisabled={!name.trim() || !slug.trim()}
									classNameSuccess="hover:border-success/60"
								/>
							</div> */}
						</form>
					</div>
				</TabPanel>
				<TabPanel tabId={"members"}>
					<OrganizationMembers />
				</TabPanel>
			</TabbedDialog>

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
		</>
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
		<div className="w-full aspect-video max-w-1/2 mx-auto">
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
	className,
}: {
	currentImage: string | null;
	openFileDialog: () => void;
	removeFile: (id: string) => void;
	files: FileWithPreview[];
	className?: string;
}) {
	return (
		<div className={cn(className)}>
			<div className="border-background bg-muted relative flex size-24 items-center justify-center overflow-hidden rounded-xl shadow-xs shadow-black/10 group/image">
				{currentImage && (
					<Image
						src={currentImage}
						className="size-full object-cover group-hover/image:blur-xs transition-all"
						width={96}
						height={96}
						alt="Organization logo"
					/>
				)}
				<button
					type="button"
					className="focus-visible:border-ring focus-visible:ring-ring/50 absolute flex size-8 cursor-pointer items-center justify-center rounded-full bg-muted/0 text-foreground/0 group-hover/image:text-foreground outline-none group-hover/image:bg-muted/80 hover:bg-muted focus-visible:ring-[3px] transition-all"
					onClick={openFileDialog}
					aria-label="Change organization logo"
				>
					<ImagePlusIcon size={16} aria-hidden="true" />
				</button>
				{currentImage && (
					<button
						type="button"
						className="focus-visible:border-ring focus-visible:ring-ring/50 absolute top-0 right-0 flex size-6 cursor-pointer items-center justify-center rounded-full bg-muted/0 text-foreground/0 transition-all outline-none hover:bg-muted group-hover/image:text-foreground/60 hover:text-foreground focus-visible:ring-[3px]"
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
