
import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import {
    AdaptiveDialog,
    AdaptiveDialogBody,
    AdaptiveDialogClose,
    AdaptiveDialogContent,
    AdaptiveDialogDescription,
    AdaptiveDialogFooter,
    AdaptiveDialogHeader,
    AdaptiveDialogTitle,
    AdaptiveDialogTrigger,
} from "@repo/ui/components/adaptive-dialog";
import {
    Tile,
    TileAction,
    TileDescription,
    TileHeader,
    TileIcon,
    TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { useToastAction } from "@/lib/util";
import { transferOrganizationByUserId, deleteOrganizationAction } from "@/lib/fetches/organization";
import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { IconCrown, IconUser, IconUserPlus, IconAlertTriangle, IconTrash } from "@tabler/icons-react";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";


export default function Danger() {
    const { account } = useLayoutData();
    const { organization } = useLayoutOrganizationSettings();
    const { runWithToast } = useToastAction();
    const [selectedMember, setSelectedMember] = useState<(typeof organization.members)[0] | null>(null);
    const [confirmInput, setConfirmInput] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const isCreator = account?.id === organization?.createdBy;
    const isFreePlan = !organization.plan || organization.plan === "free";

    // Members that can receive ownership (exclude the current user)
    const transferableMembers = organization.members.filter((m) => m.userId !== account?.id);

    if (!isCreator || !organization) {
        return null;
    }

    const handleTransferOwnership = async () => {
        if (!selectedMember) return;

        const result = await runWithToast(
            "transfer-ownership",
            {
                loading: {
                    title: "Transferring ownership...",
                    description: "Please wait while we transfer ownership.",
                },
                success: {
                    title: "Ownership transferred",
                    description: "The organization ownership has been transferred.",
                },
                error: {
                    title: "Failed to transfer ownership",
                    description: "An error occurred while transferring ownership.",
                },
            },
            () => transferOrganizationByUserId(organization.id, selectedMember.userId),
        );

        if (result?.success) {
            setSelectedMember(null);
            setConfirmInput("");
            setDialogOpen(false);
            // Redirect to root — the current user is no longer the owner so
            // this settings section would be hidden and local state would be stale.
            window.location.href = "/";
        }
    };

    const handleDeleteOrganization = async () => {
        const result = await runWithToast(
            "delete-organization",
            {
                loading: {
                    title: "Deleting organization...",
                    description: "Please wait while we delete this organization.",
                },
                success: {
                    title: "Organization deleted",
                    description: "The organization has been deleted.",
                },
                error: {
                    title: "Failed to delete organization",
                    description: "An error occurred.",
                },
            },
            () => deleteOrganizationAction(organization.id),
        );

        if (result?.success) {
            setDeleteDialogOpen(false);
            window.location.href = "/";
        }
    };

    return (
        <>
            <Separator />
            <div className="flex flex-col gap-3">
                <div className="bg-card rounded-lg flex flex-col">
                    <Tile className="md:w-full" variant={"transparent"}>
                        <TileHeader className="md:w-full">
                            <TileTitle className="text-sm">Transfer ownership</TileTitle>
                            <TileDescription className="text-xs leading-normal!">
                                Transfer ownership of this organization to another member
                            </TileDescription>
                        </TileHeader>
                        <TileAction>
                            <AdaptiveDialog
                                open={dialogOpen}
                                onOpenChange={(open) => {
                                    setDialogOpen(open);
                                    if (!open) {
                                        setSelectedMember(null);
                                        setConfirmInput("");
                                    }
                                }}
                            >
                                <AdaptiveDialogTrigger asChild>
                                    <Button variant="primary" size={"sm"}>
                                        <IconCrown />
                                        Transfer
                                    </Button>
                                </AdaptiveDialogTrigger>
                                <AdaptiveDialogContent>
                                    {!selectedMember ? (
                                        <>
                                            <AdaptiveDialogHeader className="bg-card">
                                                <AdaptiveDialogTitle asChild>
                                                    <Label variant={"heading"}>Transfer Ownership</Label>
                                                </AdaptiveDialogTitle>
                                                <AdaptiveDialogDescription>
                                                    Select a member to transfer ownership to
                                                </AdaptiveDialogDescription>
                                            </AdaptiveDialogHeader>
                                            <AdaptiveDialogBody className="max-h-[300px] overflow-y-auto">
                                                <div className="flex flex-col gap-2">
                                                    {transferableMembers.map((member) => (
                                                        <Tile
                                                            key={member.id}
                                                            className="w-full hover:bg-accent cursor-pointer"
                                                            onClick={() => setSelectedMember(member)}
                                                        >
                                                            <TileHeader className="w-full">
                                                                <TileIcon className="bg-transparent">
                                                                    <Avatar className="h-8 w-8 rounded-md">
                                                                        <AvatarImage
                                                                            src={member.user.image || ""}
                                                                            alt={member.user.name}
                                                                            className="rounded-none"
                                                                        />
                                                                        <AvatarFallback className="rounded-md uppercase text-xs">
                                                                            <IconUser className="size-4" />
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                </TileIcon>
                                                                <TileTitle className="text-sm">
                                                                    {member.user.name}
                                                                </TileTitle>
                                                                <TileDescription className="text-xs">
                                                                    {member.user.email}
                                                                </TileDescription>
                                                            </TileHeader>
                                                        </Tile>
                                                    ))}
                                                    {transferableMembers.length === 0 && (
                                                        <div className="flex flex-col items-center justify-center gap-2 p-4 text-muted-foreground">
                                                            <IconUserPlus className="size-8" />
                                                            <Label variant={"description"}>
                                                                No members found to transfer ownership to
                                                            </Label>
                                                        </div>
                                                    )}
                                                </div>
                                            </AdaptiveDialogBody>
                                            <AdaptiveDialogFooter>
                                                <AdaptiveDialogClose asChild>
                                                    <Button variant={"outline"}>Cancel</Button>
                                                </AdaptiveDialogClose>
                                            </AdaptiveDialogFooter>
                                        </>
                                    ) : (
                                        <>
                                            <AdaptiveDialogHeader className="bg-card">
                                                <AdaptiveDialogTitle asChild>
                                                    <Label variant={"heading"}>Confirm Transfer</Label>
                                                </AdaptiveDialogTitle>
                                                <AdaptiveDialogDescription>
                                                    Are you sure you want to transfer ownership to {selectedMember.user.name}?
                                                </AdaptiveDialogDescription>
                                            </AdaptiveDialogHeader>
                                            <AdaptiveDialogBody className="flex flex-col gap-4">
                                                <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                                                    <IconAlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
                                                    <div className="flex flex-col gap-1">
                                                        <Label className="text-destructive font-medium">
                                                            This action gives {selectedMember.user.name} full control:
                                                        </Label>
                                                        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                                            <li>Access to all organization data and settings</li>
                                                            <li>Billing and subscription management</li>
                                                            <li>Ability to delete the organization</li>
                                                            <li>Transfer or remove your ownership</li>
                                                        </ul>
                                                        <Label className="text-sm mt-2">
                                                            You will lose owner privileges and become a regular member.
                                                        </Label>
                                                    </div>
                                                </div>
                                                <Tile className="w-full" variant="outline">
                                                    <TileHeader className="w-full">
                                                        <TileIcon className="bg-transparent">
                                                            <Avatar className="h-8 w-8 rounded-md">
                                                                <AvatarImage
                                                                    src={selectedMember.user.image || ""}
                                                                    alt={selectedMember.user.name}
                                                                    className="rounded-none"
                                                                />
                                                                <AvatarFallback className="rounded-md uppercase text-xs">
                                                                    <IconUser className="size-4" />
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        </TileIcon>
                                                        <TileTitle className="text-sm">
                                                            {selectedMember.user.name}
                                                        </TileTitle>
                                                        <TileDescription className="text-xs">
                                                            {selectedMember.user.email}
                                                        </TileDescription>
                                                    </TileHeader>
                                                </Tile>
                                                <div className="flex flex-col gap-2">
                                                    <Label className="text-sm text-muted-foreground">
                                                        Type <span className="font-semibold text-foreground">{organization.name}</span> to confirm
                                                    </Label>
                                                    <Input
                                                        value={confirmInput}
                                                        onChange={(e) => setConfirmInput(e.target.value)}
                                                        placeholder={organization.name}
                                                    />
                                                </div>
                                            </AdaptiveDialogBody>
                                            <AdaptiveDialogFooter>
                                                <Button variant={"outline"} onClick={() => { setSelectedMember(null); setConfirmInput(""); }}>
                                                    Back
                                                </Button>
                                                <Button
                                                    variant={"destructive"}
                                                    onClick={handleTransferOwnership}
                                                    disabled={confirmInput !== organization.name}
                                                >
                                                    <IconCrown className="size-4" />
                                                    Transfer Ownership
                                                </Button>
                                            </AdaptiveDialogFooter>
                                        </>
                                    )}
                                </AdaptiveDialogContent>
                            </AdaptiveDialog>
                        </TileAction>
                    </Tile>
                </div>

                <div className="bg-card rounded-lg flex flex-col">
                    <Tile className="md:w-full" variant={"transparent"}>
                        <TileHeader className="md:w-full">
                            <TileTitle className="text-sm">Delete organization</TileTitle>
                            <TileDescription className="text-xs leading-normal!">
                                {isFreePlan
                                    ? "Permanently delete this organization and all its data"
                                    : `You must downgrade to the free plan before deleting`}
                            </TileDescription>
                        </TileHeader>
                        <TileAction>
                            <AdaptiveDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                <AdaptiveDialogTrigger asChild>
                                    <Button variant="destructive" size={"sm"} disabled={!isFreePlan}>
                                        <IconTrash />
                                        Delete
                                    </Button>
                                </AdaptiveDialogTrigger>
                                <AdaptiveDialogContent>
                                    <AdaptiveDialogHeader className="bg-card">
                                        <AdaptiveDialogTitle asChild>
                                            <Label variant={"heading"}>Delete Organization</Label>
                                        </AdaptiveDialogTitle>
                                        <AdaptiveDialogDescription>
                                            Are you sure you want to delete {organization.name}? This action cannot be undone.
                                        </AdaptiveDialogDescription>
                                    </AdaptiveDialogHeader>
                                    <AdaptiveDialogBody className="flex flex-col gap-4">
                                        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                                            <IconAlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
                                            <div className="flex flex-col gap-1">
                                                <Label className="text-destructive font-medium">
                                                    This will permanently delete:
                                                </Label>
                                                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                                    <li>All tasks and comments</li>
                                                    <li>All team members and their data</li>
                                                    <li>All labels, categories, and views</li>
                                                    <li>All uploaded files including organization assets and member attachments</li>
                                                </ul>
                                                <Label className="text-sm mt-2 font-medium text-destructive">
                                                    This action is irreversible.
                                                </Label>
                                            </div>
                                        </div>
                                    </AdaptiveDialogBody>
                                    <AdaptiveDialogFooter>
                                        <AdaptiveDialogClose asChild>
                                            <Button variant={"outline"}>Cancel</Button>
                                        </AdaptiveDialogClose>
                                        <Button variant={"destructive"} onClick={handleDeleteOrganization}>
                                            <IconTrash className="size-4" />
                                            Delete Organization
                                        </Button>
                                    </AdaptiveDialogFooter>
                                </AdaptiveDialogContent>
                            </AdaptiveDialog>
                        </TileAction>
                    </Tile>
                </div>
            </div>
        </>
    );
}
