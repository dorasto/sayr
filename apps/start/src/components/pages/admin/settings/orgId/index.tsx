import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import {
  Tile,
  TileAction,
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
import { useCallback, useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import {
  updateOrganizationAction,
  uploadOrganizationLogo,
} from "@/lib/fetches/organization";
import { handleFileValidation } from "@/lib/utils/file-validation";

export default function SettingsOrganizationPage() {
  const { ws } = useLayoutData();
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const { organization, setOrganization } = useLayoutOrganizationSettings();

  // Name state
  const [name, setName] = useState(organization.name);
  const [isNameSaving, setIsNameSaving] = useState(false);

  // Image crop state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // File upload hook
  const [, { openFileDialog, getInputProps, inputRef }] = useFileUpload({
    accept: "image/*",
    multiple: false,
  });

  useWebSocketSubscription({
    ws,
    orgId: organization.id,
    organization: organization,
    channel: "admin",
    setOrganization: setOrganization,
  });

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
              logo: uploadResult.image,
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

  const handleNameSave = useCallback(async () => {
    if (name === organization.name) return;

    setIsNameSaving(true);
    try {
      const result = await updateOrganizationAction(
        organization.id,
        {
          name,
          slug: organization.slug,
          logo: organization.logo || undefined,
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

  if (!organization) {
    return null;
  }

  const nameChanged = name !== organization.name;

  return (
    <div className="bg-card rounded-lg flex flex-col">
      {/* Combined Image + Name Row */}
      <Tile className="md:w-full" variant={"transparent"}>
        <TileHeader className="md:w-full">
          <TileTitle>Display</TileTitle>
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
                className={cn(!nameChanged && "opacity-50")}
              >
                <IconCheck />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </TileAction>
      </Tile>

      <Tile className="md:w-full w-full" variant={"transparent"}>
        <TileHeader className="w-full">
          <TileTitle className="w-full">Slug</TileTitle>
        </TileHeader>
        <TileAction className="w-full">
          <InputGroup className="bg-accent border-0 shadow-none transition-all">
            <InputGroupInput placeholder="my-org" value={organization.slug} />
            <InputGroupAddon align="inline-end">
              <InputGroupText>.sayr.io</InputGroupText>
              <Separator orientation="vertical" className="h-3" />
              <InputGroupButton variant={"ghost"} size={"icon-sm"}>
                <IconCheck />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </TileAction>
      </Tile>

      <Tile className="md:w-full" variant={"transparent"}>
        <TileHeader className="md:w-full">
          <TileTitle>Description</TileTitle>
        </TileHeader>
        <TileAction className="w-full">
          <InputGroup className="bg-accent border-0 shadow-none transition-all">
            <InputGroupInput
              placeholder="Description"
              value={organization.description || ""}
            />

            <InputGroupAddon align="inline-end">
              <InputGroupButton variant={"ghost"} size={"icon-sm"}>
                <IconCheck />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </TileAction>
      </Tile>

      {/* Hidden file input */}
      <input ref={inputRef} {...getInputProps()} onChange={handleFileSelect} />

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
          title="Crop Organization Logo"
          description="Adjust the crop area to set your organization's logo."
        />
      )}
    </div>
  );
}
