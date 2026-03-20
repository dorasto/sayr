
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
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { useToastAction } from "@/lib/util";
import { transferOrganizationByUserId } from "@/lib/fetches/organization";
import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { IconCrown, IconUser, IconUserPlus } from "@tabler/icons-react";
import { cn } from "@repo/ui/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";

export default function Danger() {
    const { account } = useLayoutData();
    const { organization, setOrganization } = useLayoutOrganizationSettings();
    const { runWithToast, isFetching } = useToastAction();

    const isCreator = account?.id === organization?.createdBy;

    if (!isCreator || !organization) {
        return null;
    }

    const handleTransferOwnership = async (newOwnerId: string) => {
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
            () => transferOrganizationByUserId(organization.id, newOwnerId),
        );

        if (result?.success) {
            setOrganization({
                ...organization,
                createdBy: newOwnerId,
            });
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
                            <AdaptiveDialog>
                                <AdaptiveDialogTrigger asChild>
                                    <Button variant="primary" size={"sm"}>
                                        <IconCrown />
                                        Transfer
                                    </Button>
                                </AdaptiveDialogTrigger>
                                <AdaptiveDialogContent>
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
                                            {organization.members.map((member) => (
                                                <Tile
                                                    key={member.id}
                                                    className={cn(
                                                        "w-full hover:bg-accent cursor-pointer",
                                                        member.userId === account?.id && "opacity-50 pointer-events-none",
                                                    )}
                                                    onClick={() => handleTransferOwnership(member.userId)}
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
                                                            {member.userId === account?.id && " (you)"}
                                                        </TileTitle>
                                                        <TileDescription className="text-xs">
                                                            {member.user.email}
                                                        </TileDescription>
                                                    </TileHeader>
                                                </Tile>
                                            ))}
                                            {organization.members.length === 0 && (
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
                                </AdaptiveDialogContent>
                            </AdaptiveDialog>
                        </TileAction>
                    </Tile>
                </div>
            </div>
        </>
    );
}
