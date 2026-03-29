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
import {
  IconTrash,
  IconAlertTriangle,
  IconCheck,
  IconPhoto,
  IconChevronDown,
} from "@tabler/icons-react";
import { Input } from "@repo/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@repo/ui/components/input-group";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { useCallback, useState } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  updateUserAction,
  uploadUserProfilePicture,
  deleteUserAction,
} from "@/lib/fetches/user";
import { handleFileValidation } from "@/lib/utils/file-validation";
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Button } from "@repo/ui/components/button";
import { useStore } from "@tanstack/react-store";
import {
  userPreferencesStore,
  userPreferencesActions,
} from "@/lib/stores/user-preferences-store";

/**
 * Props for the standalone UserSettingsContent component.
 * This allows the settings UI to be reused outside the admin layout
 * (e.g., in the public-side user settings dialog).
 */
export interface UserSettingsContentProps {
  account: {
    name: string;
    displayName: string | null;
    email: string;
    image: string | null;
    id: string;
  };
  organizations?: Array<{ id: string; name: string; createdBy: string | null }>;
  onAccountUpdated: () => void;
}

/**
 * Standalone user settings UI that can be used in any context.
 * Requires account data and a callback for when the account is updated.
 */
export function UserSettingsContent({
  account,
  organizations = [],
  onAccountUpdated,
}: UserSettingsContentProps) {
  const ownsOrgs = organizations.some((org) => org.createdBy === account.id);
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

  const handleDisplayNameSave = useCallback(async () => {
    if (!displayNameChanged) return;

    setIsDisplayNameSaving(true);
    try {
      const result = await updateUserAction({ displayName });

      if (result.success && result.data) {
        onAccountUpdated();
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
  }, [displayName, displayNameChanged, onAccountUpdated]);

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
          onAccountUpdated();
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
    [account, onAccountUpdated, cropSrc],
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

      <Tile className="md:w-full border border-destructive/20">
        <TileHeader>
          <TileTitle className="text-destructive">Delete account</TileTitle>
          <TileDescription className="text-xs">
            {ownsOrgs
              ? "You must transfer or delete organizations you own before deleting your account"
              : "Permanently delete your account and all associated data"}
          </TileDescription>
        </TileHeader>
        <TileAction>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={ownsOrgs}>
                <IconTrash className="size-4" />
                Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account and all your data.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <IconAlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <Label className="text-destructive font-medium">
                    Before you delete your account:
                  </Label>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Transfer ownership of any organizations you own</li>
                    <li>
                      You will lose access to all organizations you are a member
                      of
                    </li>
                    <li>All your assets will be permanently deleted</li>
                  </ul>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={async () => {
                    const result = await deleteUserAction();
                    if (result.success) {
                      window.location.href = "/";
                    } else {
                      headlessToast.error({
                        title: "Failed to delete account",
                        description: result.error,
                      });
                    }
                  }}
                >
                  <IconTrash className="size-4" />
                  Delete account
                </AlertDialogAction>
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

export type UserPreferenceTypes = {
  isDialog?: boolean;
};

export function UserPreferences({ isDialog = false }: UserPreferenceTypes) {
  const { theme, setTheme } = useTheme();
  const taskOpenMode = useStore(userPreferencesStore, (s) => s.taskOpenMode);

  return (
    <div className="bg-card rounded-lg flex flex-col">
      <Tile className="md:w-full">
        <TileHeader>
          <TileTitle>Theme</TileTitle>
        </TileHeader>
        <TileAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="primary" size="sm" className="capitalize">
                {theme}
                <IconChevronDown className="size-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={theme}
                onValueChange={(v) => setTheme(v as typeof theme)}
              >
                <DropdownMenuRadioItem value="light">
                  Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </TileAction>
      </Tile>
      {isDialog == false && (
        <Tile className="md:w-full">
          <TileHeader>
            <TileTitle>Task open behavior</TileTitle>
            <TileDescription className="text-xs">
              Choose how tasks open when clicked from lists
            </TileDescription>
          </TileHeader>
          <TileAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="primary" size="sm" className="capitalize">
                  {taskOpenMode}
                  <IconChevronDown className="size-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={taskOpenMode}
                  onValueChange={(v) =>
                    userPreferencesActions.setTaskOpenMode(
                      v as "dialog" | "page",
                    )
                  }
                >
                  <DropdownMenuRadioItem value="dialog">
                    Dialog
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="page">
                    Page
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </TileAction>
        </Tile>
      )}
    </div>
  );
}
