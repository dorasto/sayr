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
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlusIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useLayoutData } from "@/app/admin/Context";
import { useCharacterLimit } from "@/app/hooks/use-character-limit";
import { type FileWithPreview, useFileUpload } from "@/app/hooks/use-file-upload";
import { type UpdateOrganizationData, updateOrganizationAction } from "@/app/lib/updateOrganization";

interface Organization {
	id: string;
	name: string;
	slug: string;
	logo?: string | null;
	metadata?: Record<string, unknown>;
}

interface UpdateOrgDialogProps {
	organization: Organization;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = (error) => reject(error);
	});
};

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
	const initialFiles: FileWithPreview[] = organization.logo
		? [
				{
					name: "current-logo.jpg",
					size: 0,
					type: "image/jpeg",
					lastModified: Date.now(),
					webkitRelativePath: "",
					id: "current-logo",
					preview: organization.logo,
					arrayBuffer: async () => new ArrayBuffer(0),
					bytes: async () => new Uint8Array(0),
					stream: () => new ReadableStream(),
					text: async () => "",
					slice: () => new Blob(),
				} as FileWithPreview,
			]
		: [];

	const [{ files }, { removeFile, openFileDialog, getInputProps }] = useFileUpload({
		accept: "image/*",
		initialFiles,
		multiple: false,
	});

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
					logo: files[0]?.preview || null,
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

			// Convert file to base64 if a new file is uploaded
			if (files[0] && files[0].id !== "current-logo") {
				logoBase64 = await fileToBase64(files[0]);
			} else if (files[0] && files[0].id === "current-logo") {
				// Keep existing logo
				logoBase64 = organization.logo || undefined;
			}

			const updateData: UpdateOrganizationData = {
				name: name.trim(),
				slug: slug.trim(),
				logo: logoBase64,
				metadata: {
					...organization.metadata,
					description: description.trim() || undefined,
				},
			};

			updateMutation.mutate(updateData);
		} catch {
			toast.error("Failed to process logo image");
		}
	};

	const currentImage = files[0]?.preview || null;

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="flex flex-col gap-0 overflow-y-visible p-0 sm:max-w-lg [&>button:last-child]:top-3.5">
				<DialogHeader className="contents space-y-0 text-left">
					<DialogTitle className="border-b px-6 py-4 text-base">Edit Organization</DialogTitle>
				</DialogHeader>
				<DialogDescription className="sr-only">
					Make changes to your organization here. You can change the logo, name, slug, and description.
				</DialogDescription>
				<div className="overflow-y-auto">
					<LogoUpload
						currentImage={currentImage}
						openFileDialog={openFileDialog}
						removeFile={removeFile}
						files={files}
					/>
					<div className="px-6 pt-4 pb-6">
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor={`${id}-name`}>Organization Name</Label>
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
			<input {...getInputProps()} />
		</Dialog>
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
		<div className="h-32">
			<div className="bg-muted relative flex size-full items-center justify-center overflow-hidden">
				{currentImage && (
					<Image
						className="size-full object-cover"
						src={currentImage}
						alt="Organization logo"
						width={512}
						height={128}
					/>
				)}
				<div className="absolute inset-0 flex items-center justify-center gap-2">
					<button
						type="button"
						className="focus-visible:border-ring focus-visible:ring-ring/50 z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px]"
						onClick={openFileDialog}
						aria-label={currentImage ? "Change logo" : "Upload logo"}
					>
						<ImagePlusIcon size={16} aria-hidden="true" />
					</button>
					{currentImage && (
						<button
							type="button"
							className="focus-visible:border-ring focus-visible:ring-ring/50 z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px]"
							onClick={() => files[0]?.id && removeFile(files[0].id)}
							aria-label="Remove logo"
						>
							<XIcon size={16} aria-hidden="true" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
