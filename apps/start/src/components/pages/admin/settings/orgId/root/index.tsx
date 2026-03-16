import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import {
  Tile,
  TileAction,
  TileDescription,
  TileHeader,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { ImageCrop } from "@repo/ui/components/image-crop";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@repo/ui/components/input-group";
import { Separator } from "@repo/ui/components/separator";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconCheck, IconPhoto } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  updateOrganizationAction,
  uploadOrganizationBanner,
  uploadOrganizationLogo,
} from "@/lib/fetches/organization";
import { handleFileValidation } from "@/lib/utils/file-validation";
import { Label } from "@repo/ui/components/label";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";

export default function SettingsOrganizationPage() {
  const { serverEvents } = useLayoutData();
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const { organization, setOrganization } = useLayoutOrganizationSettings();

  // Name state
  const [name, setName] = useState(organization.name);
  const [isNameSaving, setIsNameSaving] = useState(false);

  // Slug state
  const [slug, setSlug] = useState(organization.slug);
  const [isSlugSaving, setIsSlugSaving] = useState(false);

  //Org Short Id
  const [orgShortId, setShortId] = useState(organization.shortId);
  const [isOrgShortIdSaving, setisOrgShortIdSaving] = useState(false);

  // Description state
  const [description, setDescription] = useState(organization.description);
  const [isDescriptionSaving, setIsDescriptionSaving] = useState(false);

  // Image crop state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Banner crop state
  const [bannerCropModalOpen, setBannerCropModalOpen] = useState(false);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);
  const [isBannerUploading, setIsBannerUploading] = useState(false);

  // File upload hook
  const [, { openFileDialog, getInputProps, inputRef }] = useFileUpload({
    accept: "image/*",
    multiple: false,
  });

  // Banner file upload hook
  const [
    ,
    {
      openFileDialog: openBannerFileDialog,
      getInputProps: getBannerInputProps,
      inputRef: bannerInputRef,
    },
  ] = useFileUpload({
    accept: "image/*",
    multiple: false,
  });

  useServerEventsSubscription({
    serverEvents,
    orgId: organization.id,
    organization: organization,
    channel: "admin",
    setOrganization: setOrganization,
  });
  useEffect(() => {
    setName(organization.name);
    setSlug(organization.slug);
    setShortId(organization.shortId);
    setDescription(organization.description || "");
  }, [organization.id]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!handleFileValidation(file)) {
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setCropSrc(previewUrl);
      setCropModalOpen(true);

      // Reset input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [inputRef],
  );

  const handleBannerFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!handleFileValidation(file)) {
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setBannerCropSrc(previewUrl);
      setBannerCropModalOpen(true);

      // Reset input so the same file can be selected again
      if (bannerInputRef.current) {
        bannerInputRef.current.value = "";
      }
    },
    [bannerInputRef],
  );

  const handleCropComplete = useCallback(
    async (croppedImageBase64: string) => {
      setIsUploading(true);
      try {
        // Convert base64 to Blob
        const response = await fetch(croppedImageBase64);
        const blob = await response.blob();
        const file = new File([blob], "logo.webp", { type: "image/webp" });

        // Upload the cropped image
        const uploadResult = await uploadOrganizationLogo(
          organization.id,
          file,
          organization.logo,
        );

        if (uploadResult.success) {
          // Update organization with new logo URL
          const updateResult = await updateOrganizationAction(
            organization.id,
            {
              name: organization.name,
              slug: organization.slug,
              shortId: organization.shortId,
              logo: uploadResult.image,
              bannerImg: organization.bannerImg || undefined,
              description: organization.description || undefined,
            },
            wsClientId,
          );

          if (updateResult.success) {
            // Preserve members from current organization when updating state
            setOrganization({
              ...updateResult.data,
              members: organization.members,
            });
            headlessToast.success({ title: "Logo updated successfully" });
          } else {
            headlessToast.error({ title: "Failed to update organization" });
          }
        } else {
          headlessToast.error({ title: "Failed to upload logo" });
        }
      } catch (error) {
        console.error("Error uploading logo:", error);
        headlessToast.error({ title: "Failed to upload logo" });
      } finally {
        setIsUploading(false);
        // Clean up the preview URL
        if (cropSrc) {
          URL.revokeObjectURL(cropSrc);
          setCropSrc(null);
        }
      }
    },
    [organization, wsClientId, setOrganization, cropSrc],
  );

  const handleBannerCropComplete = useCallback(
    async (croppedImageBase64: string) => {
      setIsBannerUploading(true);
      try {
        // Convert base64 to Blob
        const response = await fetch(croppedImageBase64);
        const blob = await response.blob();
        const file = new File([blob], "banner.webp", { type: "image/webp" });

        // Upload the cropped image
        const uploadResult = await uploadOrganizationBanner(
          organization.id,
          file,
          organization.bannerImg,
        );

        if (uploadResult.success) {
          // Update organization with new banner URL
          const updateResult = await updateOrganizationAction(
            organization.id,
            {
              name: organization.name,
              slug: organization.slug,
              shortId: organization.shortId,
              logo: organization.logo || undefined,
              bannerImg: uploadResult.image,
              description: organization.description || undefined,
            },
            wsClientId,
          );

          if (updateResult.success) {
            // Preserve members from current organization when updating state
            setOrganization({
              ...updateResult.data,
              members: organization.members,
            });
            headlessToast.success({ title: "Banner updated successfully" });
          } else {
            headlessToast.error({ title: "Failed to update organization" });
          }
        } else {
          headlessToast.error({ title: "Failed to upload banner" });
        }
      } catch (error) {
        console.error("Error uploading banner:", error);
        headlessToast.error({ title: "Failed to upload banner" });
      } finally {
        setIsBannerUploading(false);
        // Clean up the preview URL
        if (bannerCropSrc) {
          URL.revokeObjectURL(bannerCropSrc);
          setBannerCropSrc(null);
        }
      }
    },
    [organization, wsClientId, setOrganization, bannerCropSrc],
  );

  const handleNameSave = useCallback(async () => {
    if (name === organization.name) return;

    setIsNameSaving(true);
    try {
      const result = await updateOrganizationAction(
        organization.id,
        {
          name,
          slug: organization.slug,
          shortId: organization.shortId,
          logo: organization.logo || undefined,
          bannerImg: organization.bannerImg || undefined,
          description: organization.description || undefined,
        },
        wsClientId,
      );

      if (result.success) {
        // Preserve members from current organization when updating state
        setOrganization({
          ...result.data,
          members: organization.members,
        });
        headlessToast.success({ title: "Name updated successfully" });
      } else {
        headlessToast.error({ title: result.error || "Failed to update name" });
      }
    } catch (error) {
      console.error("Error updating name:", error);
      headlessToast.error({ title: "Failed to update name" });
    } finally {
      setIsNameSaving(false);
    }
  }, [name, organization, wsClientId, setOrganization]);

  const handleSlugSave = useCallback(async () => {
    if (slug === organization.slug) return;

    setIsSlugSaving(true);
    try {
      const result = await updateOrganizationAction(
        organization.id,
        {
          name: organization.name,
          slug: slug,
          shortId: organization.shortId,
          logo: organization.logo || undefined,
          bannerImg: organization.bannerImg || undefined,
          description: organization.description || undefined,
        },
        wsClientId,
      );

      if (result.success) {
        // Preserve members from current organization when updating state
        setOrganization({
          ...result.data,
          members: organization.members,
        });
        headlessToast.success({ title: "Slug updated successfully" });
      } else {
        headlessToast.error({ title: result.error || "Failed to update slug" });
      }
    } catch (error) {
      console.error("Error updating slug:", error);
      headlessToast.error({ title: "Failed to update slug" });
    } finally {
      setIsSlugSaving(false);
    }
  }, [slug, organization, wsClientId, setOrganization]);

  const handleShortIdSave = useCallback(async () => {
    if (orgShortId === organization.slug) return;

    setIsSlugSaving(true);
    try {
      const result = await updateOrganizationAction(
        organization.id,
        {
          name: organization.name,
          slug: organization.slug,
          shortId: orgShortId,
          logo: organization.logo || undefined,
          bannerImg: organization.bannerImg || undefined,
          description: organization.description || undefined,
        },
        wsClientId,
      );

      if (result.success) {
        // Preserve members from current organization when updating state
        setOrganization({
          ...result.data,
          members: organization.members,
        });
        headlessToast.success({ title: "ShortId updated successfully" });
      } else {
        headlessToast.error({
          title: result.error || "Failed to update ShortId",
        });
      }
    } catch (error) {
      console.error("Error updating ShortId:", error);
      headlessToast.error({ title: "Failed to update ShortId" });
    } finally {
      setisOrgShortIdSaving(false);
    }
  }, [orgShortId, organization, wsClientId, setOrganization]);

  const handleDescriptionSave = useCallback(async () => {
    if (description === organization.description) return;

    setIsDescriptionSaving(true);
    try {
      const result = await updateOrganizationAction(
        organization.id,
        {
          name: organization.name,
          slug: organization.slug,
          shortId: organization.shortId,
          logo: organization.logo || undefined,
          bannerImg: organization.bannerImg || undefined,
          description: description || undefined,
        },
        wsClientId,
      );

      if (result.success) {
        // Preserve members from current organization when updating state
        setOrganization({
          ...result.data,
          members: organization.members,
        });
        headlessToast.success({ title: "Description updated successfully" });
      } else {
        headlessToast.error({
          title: result.error || "Failed to update description",
        });
      }
    } catch (error) {
      console.error("Error updating description:", error);
      headlessToast.error({ title: "Failed to update description" });
    } finally {
      setIsDescriptionSaving(false);
    }
  }, [description, organization, wsClientId, setOrganization]);

  if (!organization) {
    return null;
  }

  const nameChanged = name !== organization.name;
  const slugChanged = slug !== organization.slug;
  const shortIdChanged = orgShortId !== organization.shortId;
  const descriptionChanged = description !== organization.description;

  return (
    <div className="bg-card rounded-lg flex flex-col">
      {/* Combined Image + Name Row */}
      <Tile className="md:w-full items-start" variant={"transparent"}>
        <TileHeader className="md:w-full">
          <TileTitle className="text-sm">Display</TileTitle>
          <TileDescription asChild>
            <Label variant={"description"} className="text-xs">
              Basic information about your organization
            </Label>
          </TileDescription>
        </TileHeader>
        <TileAction className="w-full">
          <InputGroup className="bg-accent border-0 shadow-none transition-all">
            <InputGroupAddon align="inline-start" className="pl-2">
              <InputGroupButton
                variant="accent"
                size="icon-sm"
                className="relative group/logo overflow-hidden rounded-md border-0"
                onClick={openFileDialog}
                disabled={isUploading}
              >
                <Avatar className="size-7 rounded-md">
                  <AvatarImage
                    src={organization.logo || undefined}
                    alt={organization.name}
                  />
                  <AvatarFallback className="rounded-md text-xs">
                    {organization.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/logo:opacity-100 transition-opacity",
                    isUploading && "opacity-100",
                  )}
                >
                  <IconPhoto className="size-4 text-white" />
                </div>
              </InputGroupButton>
            </InputGroupAddon>

            <InputGroupInput
              placeholder="My Organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <InputGroupAddon align="inline-end">
              <InputGroupButton
                variant="ghost"
                size="icon-sm"
                onClick={handleNameSave}
                disabled={!nameChanged || isNameSaving}
                className={cn(!nameChanged && "opacity-50 text-foreground/0")}
              >
                <IconCheck />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </TileAction>
      </Tile>

      <Tile className="md:w-full w-full items-start" variant={"transparent"}>
        <TileHeader className="w-full">
          <TileTitle className="text-sm">Slug</TileTitle>
          <TileDescription asChild>
            <Label variant={"description"} className="text-xs">
              The unique identifier for your organization.
            </Label>
          </TileDescription>
        </TileHeader>
        <TileAction className="w-full">
          <InputGroup className="bg-accent border-0 shadow-none transition-all">
            <InputGroupInput
              placeholder="My Organization"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>.sayr.io</InputGroupText>
              <Separator orientation="vertical" className="h-3" />
              <InputGroupButton
                variant="ghost"
                size="icon-sm"
                onClick={handleSlugSave}
                disabled={!slugChanged || isSlugSaving}
                className={cn(!slugChanged && "opacity-50 text-foreground/0")}
              >
                <IconCheck />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </TileAction>
      </Tile>

      <Tile className="md:w-full w-full items-start" variant="transparent">
        <TileHeader className="w-full">
          <TileTitle className="text-sm">Short identifier</TileTitle>
          <TileDescription asChild>
            <Label variant={"description"} className="text-xs">
              A short, 3-letter code used as a prefix for IDs and branches. For
              example: DEV-123.
            </Label>
          </TileDescription>
        </TileHeader>
        <TileAction className="w-full">
          <InputGroup className="bg-accent border-0 shadow-none transition-all">
            <InputGroupInput
              placeholder="ENG"
              value={orgShortId}
              onChange={(e) => {
                const raw = e.target.value.toUpperCase();
                const lettersOnly = raw.replace(/[^A-Z]/g, "");
                setShortId(lettersOnly.slice(0, 3));
              }}
              className="uppercase font-mono"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>
                {orgShortId ? `${orgShortId}-123` : "SAY-123"}
              </InputGroupText>
              <Separator orientation="vertical" className="h-3" />
              <InputGroupButton
                variant="ghost"
                size="icon-sm"
                onClick={handleShortIdSave}
                disabled={!shortIdChanged || isOrgShortIdSaving}
                className={cn(
                  !shortIdChanged && "opacity-50 text-foreground/0",
                )}
              >
                <IconCheck />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </TileAction>
      </Tile>

      <Tile className="md:w-full" variant={"transparent"}>
        <TileHeader className="md:w-full">
          <TileTitle className="text-sm">Description</TileTitle>
        </TileHeader>
        <TileAction className="w-full">
          <InputGroup className="bg-accent border-0 shadow-none transition-all">
            <InputGroupInput
              placeholder="Description"
              value={description || ""}
              onChange={(e) => setDescription(e.target.value)}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                variant="ghost"
                size="icon-sm"
                onClick={handleDescriptionSave}
                disabled={!descriptionChanged || isDescriptionSaving}
                className={cn(
                  !descriptionChanged && "opacity-50 text-foreground/0",
                )}
              >
                <IconCheck />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </TileAction>
      </Tile>
      <Separator />
      <Tile className="md:w-full items-start" variant={"transparent"}>
        <TileHeader className="md:w-full">
          <TileTitle className="text-sm">Banner</TileTitle>
          <TileDescription asChild>
            <Label variant={"description"} className="text-xs">
              Image for your public profile
            </Label>
          </TileDescription>
        </TileHeader>
        <TileAction className="w-full">
          <button
            className="relative w-full aspect-32/9 rounded-lg overflow-hidden border border-border bg-accent group cursor-pointer"
            onClick={openBannerFileDialog}
            type="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                openBannerFileDialog();
              }
            }}
          >
            {organization.bannerImg ? (
              <img
                src={organization.bannerImg}
                alt="Organization Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <span className="text-sm">Upload Banner</span>
              </div>
            )}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity",
                isBannerUploading && "opacity-100",
              )}
            >
              <IconPhoto className="size-8 text-white" />
            </div>
          </button>
        </TileAction>
      </Tile>

      {/* Hidden file input */}
      <input ref={inputRef} {...getInputProps()} onChange={handleFileSelect} />
      <input
        ref={bannerInputRef}
        {...getBannerInputProps()}
        onChange={handleBannerFileSelect}
      />

      {/* Image Crop Dialog */}
      {cropSrc && (
        <ImageCrop
          src={cropSrc}
          aspectRatio={1}
          isOpen={cropModalOpen}
          onOpenChange={(open) => {
            setCropModalOpen(open);
            if (!open && cropSrc) {
              URL.revokeObjectURL(cropSrc);
              setCropSrc(null);
            }
          }}
          onCropComplete={handleCropComplete}
          title="Logo"
          description="Adjust the crop area to set your organization's logo."
        />
      )}

      {/* Banner Crop Dialog */}
      {bannerCropSrc && (
        <ImageCrop
          src={bannerCropSrc}
          aspectRatio={32 / 9}
          isOpen={bannerCropModalOpen}
          onOpenChange={(open) => {
            setBannerCropModalOpen(open);
            if (!open && bannerCropSrc) {
              URL.revokeObjectURL(bannerCropSrc);
              setBannerCropSrc(null);
            }
          }}
          onCropComplete={handleBannerCropComplete}
          title="Banner"
          description="Adjust the crop area to set your organization's banner."
        />
      )}
    </div>
  );
}
