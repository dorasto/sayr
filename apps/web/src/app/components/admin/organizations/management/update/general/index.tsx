"use client";

import type { schema } from "@repo/database";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import ClipboardCopy from "@repo/ui/components/tomui/input-clipboard";
import { TabbedDialogFooter } from "@repo/ui/components/tomui/tabbed-dialog";
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";
import { useCharacterLimit } from "@/app/hooks/use-character-limit";
import { updateOrganizationAction, uploadOrganizationLogo } from "@/app/lib/fetches";
import { useToastAction } from "@/app/lib/util";
import { handleFileValidation } from "../utils/file-validation";
import type { FileWithPreview } from "../utils/types";
import LogoUpload from "./logo-upload";

export interface GeneralSettingsRef {
	submit: () => void;
	isSubmitting: boolean;
	isValid: boolean;
	setCroppedLogo: (croppedImageBase64: string) => void;
}

interface GeneralSettingsProps {
	organization: schema.OrganizationWithMembers;
	onCloseDialog: () => void;
	onRequestCrop?: (src: string, type: "logo") => void;
}

const GeneralSettings = forwardRef<GeneralSettingsRef, GeneralSettingsProps>(
	({ organization, onCloseDialog, onRequestCrop }, ref) => {
		const { runWithToast, isFetching } = useToastAction();
		const id = useId();
		const logoFileInputRef = useRef<HTMLInputElement>(null);

		// Form state - managed internally
		const [name, setName] = useState(organization.name);
		const [slug, setSlug] = useState(organization.slug);

		// Initialize with existing logo if present
		const initialLogoFiles: FileWithPreview[] = organization.logo
			? [
					{
						name: "current-logo.webp",
						size: 0,
						type: "image/webp",
						id: "current-logo",
						preview: organization.logo,
					},
				]
			: [];

		// Logo file state
		const [logoFiles, setLogoFiles] = useState<FileWithPreview[]>(initialLogoFiles);

		const maxLength = 180;
		const {
			value: description,
			characterCount,
			handleChange: handleDescriptionChange,
		} = useCharacterLimit({
			maxLength,
			initialValue: (organization?.description as string) || "",
		});

		// Handle logo file upload
		const handleLogoUpload = () => {
			logoFileInputRef.current?.click();
		};

		const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const selectedFiles = e.target.files;
			if (selectedFiles && selectedFiles.length > 0) {
				const file = selectedFiles[0];
				if (!file) return;

				if (!handleFileValidation(file)) return;

				// Create preview URL and request cropping
				const previewUrl = URL.createObjectURL(file);
				onRequestCrop?.(previewUrl, "logo");
			}
		};

		const removeLogoFile = (id: string) => {
			setLogoFiles((prev) => {
				const fileToRemove = prev.find((f) => f.id === id);
				if (fileToRemove?.preview && fileToRemove.id !== "current-logo") {
					URL.revokeObjectURL(fileToRemove.preview);
				}
				return prev.filter((f) => f.id !== id);
			});
		};

		// Add method to accept cropped logo from parent
		const setCroppedLogo = useCallback((croppedImageBase64: string) => {
			const newFile: FileWithPreview = {
				id: Math.random().toString(36).substring(2, 15),
				name: "cropped-logo.webp",
				size: 0,
				type: "image/webp",
				preview: croppedImageBase64,
			};
			setLogoFiles([newFile]);
		}, []);

		const currentLogoImage = logoFiles[0]?.preview || null;

		const handleSubmit = useCallback(
			async (e?: React.FormEvent) => {
				e?.preventDefault();

				if (!name.trim() || !slug.trim()) {
					toast.error("Name and slug are required");
					return;
				}

				try {
					let logoUrl: string | undefined;

					// 🖼 Upload new logo if necessary
					if (logoFiles[0] && logoFiles[0].id !== "current-logo") {
						const res = await fetch(logoFiles[0].preview);
						const blob = await res.blob();
						const file = new File([blob], logoFiles[0].name, { type: blob.type });

						const uploadResult = await uploadOrganizationLogo(organization.id, file, organization.logo);
						logoUrl = uploadResult.image;

						console.log("✅ Logo uploaded for org:", uploadResult.orgId, "→", uploadResult.image);
					} else if (logoFiles[0]?.id === "current-logo") {
						logoUrl = organization.logo || undefined; // keep existing logo
					}
					const data = await runWithToast(
						"update-organization",
						{
							loading: {
								title: "Updating organization...",
								description: "Please wait while we update the organization.",
							},
							success: {
								title: "Updated organization",
								description: "The organization has been successfully updated.",
							},
							error: {
								title: "Failed to update organization",
								description: "An error occurred while updating the organization.",
							},
						},
						() =>
							updateOrganizationAction(
								organization.id,
								{
									name: name.trim(),
									slug: slug.trim(),
									logo: logoUrl,
									description: description.trim(),
								},
								""
							)
					);
					if (data?.success) {
						onCloseDialog();
					}
					// biome-ignore lint/suspicious/noExplicitAny: <any>
				} catch (error: any) {
					console.error("🚀 ~ handleSubmit ~ error:", error);
					headlessToast.error({
						id: "update-organization",
						title: "Failed to update organization",
						description: error.message || "An error occurred while updating the organization.",
					});
				}
			},
			[name, slug, description, logoFiles, organization, runWithToast, onCloseDialog]
		);

		// Expose submit function to parent via ref
		useImperativeHandle(
			ref,
			() => ({
				submit: handleSubmit,
				isSubmitting: isFetching,
				isValid: name.trim() !== "" && slug.trim() !== "",
				setCroppedLogo,
			}),
			[handleSubmit, isFetching, name, slug, setCroppedLogo]
		);

		return (
			<div className="">
				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="space-y-3">
						<div className="flex gap-3 items-center w-full">
							<LogoUpload
								currentImage={currentLogoImage}
								openFileDialog={handleLogoUpload}
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
								<div className="flex gap-3 items-center">
									<div className="group relative flex-1 w-fit">
										<Label
											htmlFor={`${id}-slug`}
											className="origin-start text-muted-foreground/70 group-focus-within:text-foreground has-[+div_.peer:not(:placeholder-shown)]:text-foreground absolute top-1/2 block -translate-y-1/2 cursor-text px-1 text-sm transition-all group-focus-within:pointer-events-none group-focus-within:top-0 group-focus-within:cursor-default group-focus-within:text-xs group-focus-within:font-medium has-[+div_.peer:not(:placeholder-shown)]:pointer-events-none has-[+div_.peer:not(:placeholder-shown)]:top-0 has-[+div_.peer:not(:placeholder-shown)]:cursor-default has-[+div_.peer:not(:placeholder-shown)]:text-xs has-[+div_.peer:not(:placeholder-shown)]:font-medium z-10"
										>
											<span className="bg-popover inline-flex px-2">Slug</span>
										</Label>
										<div className="relative flex items-center">
											<Input
												id={`${id}-slug`}
												type="text"
												placeholder=" "
												value={slug}
												onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
												required
												className="bg-popover peer pe-32"
											/>

											<span className="text-muted-foreground pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-14 text-sm peer-disabled:opacity-50 ">
												.{process.env.NEXT_PUBLIC_ROOT_DOMAIN}
											</span>

											<ClipboardCopy
												value={`${slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`}
												className="ml-2 rounded aspect-square"
												urlify
											/>
										</div>
									</div>
								</div>
								<div className="w-fit"></div>
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
				</form>

				{/* Logo file input */}
				<input
					ref={logoFileInputRef}
					type="file"
					accept="image/*"
					onChange={handleLogoFileChange}
					style={{ display: "none" }}
				/>
			</div>
		);
	}
);

GeneralSettings.displayName = "GeneralSettings";

export default GeneralSettings;

// Footer component for the General tab
export function GeneralSettingsFooter({
	generalSettingsRef,
	onCloseDialog,
}: {
	generalSettingsRef: React.RefObject<GeneralSettingsRef | null>;
	onCloseDialog: () => void;
}) {
	const [isValid, setIsValid] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Poll the ref to get current state
	useEffect(() => {
		const interval = setInterval(() => {
			if (generalSettingsRef.current) {
				setIsValid(generalSettingsRef.current.isValid);
				setIsSubmitting(generalSettingsRef.current.isSubmitting);
			}
		}, 100); // Check every 100ms

		return () => clearInterval(interval);
	}, [generalSettingsRef]);

	return (
		<TabbedDialogFooter
			onCancel={onCloseDialog}
			onSubmit={() => generalSettingsRef.current?.submit()}
			isSubmitting={isSubmitting}
			submitDisabled={!isValid}
			classNameSuccess="hover:border-success/60"
		/>
	);
}
