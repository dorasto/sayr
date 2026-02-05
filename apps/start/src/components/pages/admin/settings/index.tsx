import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
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
import { Input } from "@repo/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@repo/ui/components/input-group";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { IconCheck, IconPhoto } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { updateUserAction, uploadUserProfilePicture } from "@/lib/fetches/user";
import { handleFileValidation } from "@/lib/utils/file-validation";
import { clearAuthCache } from "@/routes/(admin)/route";

export default function UserSettings() {
  const { ws, account, setAccount } = useLayoutData();
  const router = useRouter();

  // Display name state - default to displayName if set, otherwise use name
  const [displayName, setDisplayName] = useState(
    account.displayName || account.name,
  );
  const [isDisplayNameSaving, setIsDisplayNameSaving] = useState(false);

  // Profile picture crop state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // File upload hook
  const [, { openFileDialog, getInputProps, inputRef }] = useFileUpload({
    accept: "image/*",
    multiple: false,
  });

  // Track if display name has changed
  const displayNameChanged =
    displayName !== (account.displayName || account.name);

  useWebSocketSubscription({
    ws,
  });

  const handleDisplayNameSave = useCallback(async () => {
    if (!displayNameChanged) return;

    setIsDisplayNameSaving(true);
    try {
      const result = await updateUserAction({ displayName });

      if (result.success && result.data) {
        setAccount(result.data);
        // Clear the auth cache so the next navigation/refresh gets fresh data
        clearAuthCache();
        // Invalidate router to refetch loader data
        router.invalidate();
        headlessToast.success({ title: "Display name updated successfully" });
      } else {
        headlessToast.error({
          title: result.error || "Failed to update display name",
        });
      }
    } catch (error) {
      console.error("Error updating display name:", error);
      headlessToast.error({ title: "Failed to update display name" });
    } finally {
      setIsDisplayNameSaving(false);
    }
  }, [displayName, displayNameChanged, setAccount, router]);

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
        const file = new File([blob], "avatar.webp", { type: "image/webp" });

        // Upload the cropped image
        const result = await uploadUserProfilePicture(file, account.image);

        if (result.success && result.data) {
          setAccount(result.data);
          // Clear the auth cache so the next navigation/refresh gets fresh data
          clearAuthCache();
          // Invalidate router to refetch loader data
          router.invalidate();
          headlessToast.success({
            title: "Profile picture updated successfully",
          });
        } else {
          headlessToast.error({
            title: result.error || "Failed to upload profile picture",
          });
        }
      } catch (error) {
        console.error("Error uploading profile picture:", error);
        headlessToast.error({ title: "Failed to upload profile picture" });
      } finally {
        setIsUploading(false);
        // Clean up the preview URL
        if (cropSrc) {
          URL.revokeObjectURL(cropSrc);
          setCropSrc(null);
        }
      }
    },
    [account, setAccount, router, cropSrc],
  );

  return (
    <div className="bg-card rounded-lg flex flex-col">
      {/* Combined Image + Display Name Row */}
      <Tile className="md:w-full items-start" variant={"transparent"}>
        <TileHeader className="md:w-full">
          <TileTitle className="text-sm">Display</TileTitle>
          <TileDescription className="text-xs">
            Your profile picture and display name
          </TileDescription>
        </TileHeader>
        <TileAction className="w-full">
          <InputGroup className="bg-accent border-0 shadow-none transition-all">
            <InputGroupAddon align="inline-start" className="pl-2">
              <InputGroupButton
                variant="accent"
                size="icon-sm"
                className="relative group/avatar overflow-hidden rounded-md border-0"
                onClick={openFileDialog}
                disabled={isUploading}
              >
                <Avatar className="size-7 rounded-md ">
                  <AvatarImage
                    src={account.image || undefined}
                    alt={account.name}
                  />
                  <AvatarFallback className="text-xs">
                    {account.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity",
                    isUploading && "opacity-100",
                  )}
                >
                  <IconPhoto className="size-4 text-white" />
                </div>
              </InputGroupButton>
            </InputGroupAddon>

            <InputGroupInput
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <InputGroupAddon align="inline-end">
              <InputGroupButton
                variant="ghost"
                size="icon-sm"
                onClick={handleDisplayNameSave}
                disabled={!displayNameChanged || isDisplayNameSaving}
                className={cn(!displayNameChanged && "opacity-50")}
              >
                <IconCheck />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </TileAction>
      </Tile>
      <Tile className="md:w-full">
        <TileHeader>
          <TileTitle>Username</TileTitle>
          <TileDescription className="text-xs">
            Cannot be changed at present
          </TileDescription>
        </TileHeader>
        <TileAction>
          <InputGroup className="focus-within:bg-card/50 bg-accent border-0 shadow-none transition-all">
            <InputGroupInput
              placeholder="Username"
              value={account.name}
              disabled
            />
            <InputGroupAddon align="inline-end">
              <IconCheck className="opacity-50" />
            </InputGroupAddon>
          </InputGroup>
        </TileAction>
      </Tile>
      <Tile className="md:w-full">
        <TileHeader>
          <TileTitle>Email address</TileTitle>
        </TileHeader>
        <TileAction>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <InputGroup className="focus-within:bg-card/50 bg-accent border-0 shadow-none transition-all cursor-pointer">
                <InputGroupInput
                  placeholder="Email"
                  value={account.email}
                  readOnly
                  className="cursor-pointer"
                />
                <InputGroupAddon align="inline-end">
                  <IconCheck className="opacity-50" />
                </InputGroupAddon>
              </InputGroup>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Change your email address</AlertDialogTitle>
                <AlertDialogDescription>
                  In order to change your email, we'll send a confirmation link
                  to your new email address.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="bg-card p-2 rounded-lg">
                <Label className="pl-3">New email address</Label>
                <Input
                  variant={"ghost"}
                  type="email"
                  placeholder="youremail@domain.com"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled>Send</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
          title="Profile Picture"
          description="Adjust the crop area to set your profile picture."
        />
      )}
    </div>
  );
}

export function UserPreferences() {
  return (
    <div className="bg-card rounded-lg flex flex-col">
      <Tile className="md:w-full">
        <TileHeader>
          <TileTitle>Theme</TileTitle>
        </TileHeader>
        <TileAction>{/* <ThemeToggle full /> */}</TileAction>
      </Tile>
    </div>
  );
}
