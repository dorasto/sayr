"use client";

import {
	AdaptiveDialog,
	AdaptiveDialogContent,
	AdaptiveDialogDescription,
	AdaptiveDialogFooter,
	AdaptiveDialogHeader,
	AdaptiveDialogTitle,
	AdaptiveDialogTrigger,
} from "@repo/ui/components/adaptive-dialog";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { generateSlug } from "@repo/util";
import { IconBuilding, IconPlus } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createOrganizationAction } from "@/lib/fetches/organization";
import { useToastAction } from "@/lib/util";
import { useLayoutData } from "@/components/generic/Context";

interface Props {
	onSuccess?: (organization: { id: string; name: string; slug: string }) => void;
	trigger?: React.ReactNode;
}

const edition = import.meta.env.VITE_SAYR_EDITION ?? "community";

export default function CreateOrganizationDialog({ onSuccess, trigger }: Props) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
	const { runWithToast, isFetching } = useToastAction();
	const router = useRouter();
	const { organizations } = useLayoutData();

	const isLimited = edition === "community" && organizations.length >= 1;

	// Auto-generate slug from name unless manually edited
	useEffect(() => {
		if (!slugManuallyEdited && name) {
			setSlug(generateSlug(name));
		}
	}, [name, slugManuallyEdited]);

	// On community edition, hide the entire dialog trigger once the user has an org
	if (isLimited) {
		return null;
	}

	const handleSlugChange = (value: string) => {
		setSlugManuallyEdited(true);
		// Only allow lowercase letters, numbers, and hyphens
		setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
	};

	const resetForm = () => {
		setName("");
		setSlug("");
		setDescription("");
		setSlugManuallyEdited(false);
	};

	const handleCreate = async () => {
		if (!name.trim() || !slug.trim()) {
			return;
		}

		const data = await runWithToast(
			"create-organization",
			{
				loading: {
					title: "Creating organization...",
					description: "Please wait while we set up your organization.",
				},
				success: {
					title: "Organization created!",
					description: "Your new organization is ready to use.",
				},
				error: {
					title: "Failed to create organization",
					description: "An error occurred while creating the organization.",
				},
			},
			() =>
				createOrganizationAction({
					name: name.trim(),
					slug: slug.trim(),
					description: description.trim(),
				})
		);

		if (data?.success && data.data) {
			setOpen(false);
			resetForm();
			onSuccess?.(data.data);
			// Navigate to the new organization
			router.navigate({
				to: "/$orgId",
				params: { orgId: data.data.id },
			});
			// Invalidate to refresh organizations list
			router.invalidate();
		}
	};

	return (
		<AdaptiveDialog open={open} onOpenChange={setOpen}>
			<AdaptiveDialogTrigger asChild>
				{trigger || (
					<Button variant="primary" className="w-fit text-xs p-1 h-auto rounded-lg" size="sm">
						<IconPlus className="h-4 w-4" />
						<span>New Organization</span>
					</Button>
				)}
			</AdaptiveDialogTrigger>
		<AdaptiveDialogContent className="sm:max-w-md">
			<AdaptiveDialogHeader>
				<AdaptiveDialogTitle className="flex items-center gap-2">
					<IconBuilding className="h-5 w-5" />
					Create Organization
				</AdaptiveDialogTitle>
				<AdaptiveDialogDescription>
					Create a new organization to manage your projects and team.
				</AdaptiveDialogDescription>
			</AdaptiveDialogHeader>

			<div className="flex flex-col gap-4 p-4">
				<div className="flex flex-col gap-2">
					<Label htmlFor="org-name">Organization Name</Label>
					<Input
						id="org-name"
						placeholder="My Organization"
						value={name}
						onChange={(e) => setName(e.target.value)}
						autoFocus
						className="bg-accent border-transparent"
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="org-slug">
						Slug
						<span className="text-muted-foreground ml-1 text-xs">(URL-friendly identifier)</span>
					</Label>
					<div className="flex items-center gap-2">
						<Input
							id="org-slug"
							placeholder="my-organization"
							value={slug}
							onChange={(e) => handleSlugChange(e.target.value)}
							className="bg-accent border-transparent font-mono"
						/>
					</div>
					<p className="text-xs text-muted-foreground">
						Your organization will be accessible at{" "}
						<code className="bg-muted px-1 py-0.5 rounded">
							{slug || "your-slug"}.{import.meta.env.VITE_ROOT_DOMAIN || "example.com"}
						</code>
					</p>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="org-description">
						Description
						<span className="text-muted-foreground ml-1 text-xs">(optional)</span>
					</Label>
					<Textarea
						id="org-description"
						placeholder="A brief description of your organization..."
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						className="bg-accent rounded-lg border-transparent resize-none"
					/>
				</div>
			</div>

			<AdaptiveDialogFooter>
				<Button variant="ghost" onClick={() => setOpen(false)}>
					Cancel
				</Button>
				<Button variant="default" onClick={handleCreate} disabled={isFetching || !name.trim() || !slug.trim()}>
					{isFetching ? "Creating..." : "Create Organization"}
				</Button>
			</AdaptiveDialogFooter>
		</AdaptiveDialogContent>
		</AdaptiveDialog>
	);
}
