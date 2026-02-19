import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import {
    Tile,
    TileAction,
    TileDescription,
    TileHeader,
    TileIcon,
    TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
    AdaptiveDialog,
    AdaptiveDialogBody,
    AdaptiveDialogClose,
    AdaptiveDialogContent,
    AdaptiveDialogDescription,
    AdaptiveDialogFooter,
    AdaptiveDialogHeader,
    AdaptiveDialogTitle,
} from "@repo/ui/components/adaptive-dialog";
import { Label } from "@repo/ui/components/label";
import {
    ComboBox,
    ComboBoxContent,
    ComboBoxEmpty,
    ComboBoxGroup,
    ComboBoxIcon,
    ComboBoxItem,
    ComboBoxList,
    ComboBoxSearch,
    ComboBoxTrigger,
    ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import { formatDateTime } from "@repo/util";
import {
    IconDots,
    IconExternalLink,
    IconUsers,
    IconCircleFilled,
    IconPlus,
    IconSettings,
    IconBrandGithub,
    IconX,
} from "@tabler/icons-react";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import RenderIcon from "@/components/generic/RenderIcon";
import { createGithubSyncConnectionAction, deleteGithubSyncConnectionAction, toggleGithubSyncConnectionAction, updateGithubSyncConnectionAction } from "@/lib/fetches/organization";
import { useToastAction } from "@/lib/util";
import { useQueryClient } from "@tanstack/react-query";

export type githubConnections = Array<{
    installation: {
        id: string;
        organizationId: string;
        installationId: number;
        userId: string;
        createdAt: string;
        updatedAt: string;
        user: any;
    };
    githubInfo: {
        installationId: number;
        joinUserName: string;
        account: {
            login: string;
            avatar_url: string;
        };
        target_type: string;
        repositories: Array<{
            id: number;
            name: string;
            full_name: string;
        }>;
        createdAt: string;
    };
}>;
export type githubConnectionsRepositories = Array<{
    id: string;
    installationId: number;
    repoId: number;
    repoName: string;
    categoryId: string;
    createdAt: string;
    enabled: boolean;
}>;

interface Props {
    githubConnections: githubConnections;
    repositories: githubConnectionsRepositories
}

export default function SettingsOrganizationConnectionsGitHubPage({
    githubConnections, repositories
}: Props) {
    return (
        <div className="flex flex-col gap-6">
            <InstallationsSection
                githubConnections={githubConnections}
            />
            <TaskSyncSection
                githubConnections={githubConnections}
                repositories={repositories}
            />
        </div>
    );
}

/* ================= INSTALLATIONS ================= */

function InstallationsSection({
    githubConnections,
}: {
    githubConnections: githubConnections;
}) {
    return (
        <div className="bg-card rounded-lg flex flex-col">
            {githubConnections.map((connection) => {
                const info = connection.githubInfo;

                return (
                    <DropdownMenu key={connection.installation.id}>
                        <DropdownMenuTrigger asChild>
                            <Tile
                                className="hover:bg-accent data-[state=open]:bg-accent w-full!"
                                variant="transparent"
                            >
                                <TileHeader>
                                    <TileIcon className="bg-transparent">
                                        <Avatar className="h-10 w-10 rounded-md">
                                            <AvatarImage
                                                src={
                                                    info.account.avatar_url ||
                                                    ""
                                                }
                                                alt={
                                                    info.account.login
                                                }
                                            />
                                            <AvatarFallback>
                                                <IconUsers className="h-6 w-6" />
                                            </AvatarFallback>
                                        </Avatar>
                                    </TileIcon>

                                    <TileTitle>
                                        {info.account.login}
                                    </TileTitle>

                                    <TileDescription>
                                        Connected by{" "}
                                        {info.joinUserName} –{" "}
                                        {formatDateTime(
                                            new Date(
                                                info.createdAt
                                            )
                                        )}
                                    </TileDescription>
                                </TileHeader>

                                <TileAction>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                    >
                                        <IconDots />
                                    </Button>
                                </TileAction>
                            </Tile>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <a
                                    href={
                                        info.target_type === "Organization"
                                            ? `https://github.com/organizations/${info.account.login}/settings/installations/${info.installationId}`
                                            : `https://github.com/settings/installations/${info.installationId}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <IconExternalLink /> Configure
                                </a>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            })}
        </div>
    );
}

/* ================= TASK SYNC ================= */

function TaskSyncSection({
    githubConnections,
    repositories
}: {
    githubConnections: githubConnections;
    repositories: githubConnectionsRepositories
}) {
    const { categories, organization } =
        useLayoutOrganizationSettings();
    const { runWithToast, isFetching } = useToastAction();
    const queryClient = useQueryClient();

    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] =
        useState<string | null>(null);
    const [deleteId, setDeleteId] =
        useState<string | null>(null);
    const githubInfos = githubConnections.map(
        (c) => c.githubInfo
    );

    const editingRepo = repositories.find(
        (r) => r.id === editingId
    );

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
                <div className="flex flex-col">
                    <Label variant={"heading"}>
                        Task syncing
                    </Label>
                    <Label variant={"description"}>
                        Linked repositories across all GitHub installations
                    </Label>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        setEditingId(null);
                        setOpen(true);
                    }}
                >
                    <IconPlus />
                </Button>
            </div>

            <div className="bg-card rounded-lg flex flex-col">
                {repositories.map((repo) => (
                    <DropdownMenu key={repo.id}>
                        <DropdownMenuTrigger asChild>
                            <Tile
                                variant="transparent"
                                className="hover:bg-accent w-full!"
                            >
                                <TileHeader>
                                    <TileTitle>
                                        {repo.repoName}
                                    </TileTitle>

                                    <TileDescription>
                                        {categories.find(e => e.id === repo.categoryId)?.name} –{" "}
                                        {formatDateTime(
                                            new Date(repo.createdAt)
                                        )}
                                    </TileDescription>
                                </TileHeader>

                                <TileAction>
                                    <Button
                                        variant="accent"
                                        size="sm"
                                        className="bg-transparent rounded-lg"
                                    >
                                        <IconCircleFilled
                                            className={
                                                repo.enabled
                                                    ? "text-success"
                                                    : "text-muted-foreground"
                                            }
                                        />
                                        {repo.enabled ? "Enabled" : "Disabled"}
                                    </Button>
                                </TileAction>
                            </Tile>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={async () => {
                                    const nextState = !repo.enabled;

                                    await runWithToast(
                                        "toggle-github-sync",
                                        {
                                            loading: {
                                                title: nextState
                                                    ? "Enabling sync..."
                                                    : "Disabling sync...",
                                            },
                                            success: {
                                                title: nextState
                                                    ? "Sync enabled"
                                                    : "Sync disabled",
                                            },
                                            error: {
                                                title:
                                                    "Failed to update sync status",
                                            },
                                        },
                                        () =>
                                            toggleGithubSyncConnectionAction(
                                                organization.id,
                                                repo.id,
                                                nextState
                                            )
                                    );

                                    queryClient.invalidateQueries({
                                        queryKey: [
                                            "organization",
                                            organization.id,
                                            "connections",
                                            "github",
                                        ],
                                    });
                                }}
                            >
                                <IconCircleFilled
                                    className={
                                        repo.enabled
                                            ? "text-success"
                                            : "text-muted-foreground"
                                    }
                                />
                                {repo.enabled ? "Enabled" : "Disabled"}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => {
                                    setEditingId(repo.id);
                                    setOpen(true);
                                }}
                            >
                                <IconSettings />
                                Edit
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => {
                                    setDeleteId(repo.id);
                                }}
                            >
                                <IconX />
                                Remove
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ))}

                {repositories.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground">
                        No repositories linked yet.
                    </div>
                )}
            </div>

            <SyncDialog
                open={open}
                onOpenChange={setOpen}
                githubInfos={githubInfos}
                allSyncedRepos={repositories}
                editingRepo={editingRepo || null}
                categories={categories}
            />
            <AdaptiveDialog
                open={deleteId !== null}
                onOpenChange={(open) =>
                    !open && setDeleteId(null)
                }
            >
                <AdaptiveDialogContent>
                    <AdaptiveDialogHeader className="bg-card">
                        <AdaptiveDialogTitle>
                            Remove sync
                        </AdaptiveDialogTitle>
                        <AdaptiveDialogDescription>
                            Are you sure you want to remove this GitHub sync?
                        </AdaptiveDialogDescription>
                    </AdaptiveDialogHeader>

                    <AdaptiveDialogFooter>
                        <AdaptiveDialogClose asChild>
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setDeleteId(null)
                                }
                            >
                                Cancel
                            </Button>
                        </AdaptiveDialogClose>

                        <Button
                            variant="destructive"
                            disabled={isFetching}
                            onClick={async () => {
                                if (!deleteId) return;

                                await runWithToast(
                                    "delete-github-sync-connection",
                                    {
                                        loading: {
                                            title:
                                                "Deleting sync...",
                                            description:
                                                "Please wait while we remove the sync connection.",
                                        },
                                        success: {
                                            title:
                                                "Sync removed",
                                            description:
                                                "The sync connection has been successfully removed.",
                                        },
                                        error: {
                                            title:
                                                "Failed to remove sync",
                                            description:
                                                "An error occurred while removing the sync connection.",
                                        },
                                    },
                                    () =>
                                        deleteGithubSyncConnectionAction(
                                            organization.id,
                                            deleteId
                                        )
                                );

                                queryClient.invalidateQueries({
                                    queryKey: [
                                        "organization",
                                        organization.id,
                                        "connections",
                                        "github",
                                    ],
                                });

                                setDeleteId(null);
                            }}
                        >
                            Remove
                        </Button>
                    </AdaptiveDialogFooter>
                </AdaptiveDialogContent>
            </AdaptiveDialog>
        </div>
    );
}

/* ================= ADD / EDIT DIALOG ================= */

function SyncDialog({
    open,
    onOpenChange,
    githubInfos,
    allSyncedRepos,
    editingRepo,
    categories,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    githubInfos: any[];
    allSyncedRepos: any[];
    editingRepo: any | null;
    categories: any[];
}) {
    const queryClient = useQueryClient();
    const { organization } = useLayoutOrganizationSettings();
    const isEditing = !!editingRepo;
    const { runWithToast, isFetching } = useToastAction();

    const [selectedRepo, setSelectedRepo] =
        useState<string | null>(null);

    const [selectedCategory, setSelectedCategory] =
        useState<string | null>(null);

    /* ================= RESET + PREFILL ================= */

    useEffect(() => {
        if (!open) return;

        if (editingRepo) {
            setSelectedRepo(
                editingRepo.repoId?.toString() || null
            );
            setSelectedCategory(
                editingRepo.categoryId || null
            );
        } else {
            setSelectedRepo(null);
            setSelectedCategory(null);
        }
    }, [editingRepo, open]);

    /* ================= BLOCK USED REPOS ================= */

    const usedRepoIds = new Set(
        allSyncedRepos
            .filter((r) =>
                isEditing
                    ? r.id !== editingRepo?.id
                    : true
            )
            .map((r) => r.repoId)
    );

    const allRepos = githubInfos.flatMap(
        (i) => i.repositories
    );

    const availableRepos = allRepos.filter(
        (r) => !usedRepoIds.has(r.id)
    );

    /* ================= BLOCK USED CATEGORIES ================= */

    const usedCategoryIds = new Set(
        allSyncedRepos
            .filter((r) =>
                isEditing
                    ? r.id !== editingRepo?.id
                    : true
            )
            .map((r) => r.categoryId)
    );

    const availableCategories = categories.filter(
        (c) =>
            !usedCategoryIds.has(c.id) ||
            c.id === editingRepo?.categoryId
    );
    /* ================= DISPLAY NAME ================= */

    const selectedRepoName = allRepos.find(
        (r) => r.id.toString() === selectedRepo
    )?.full_name;
    const selectedCategoryData = categories.find((c) => c.id === selectedCategory);


    /* ================= UI ================= */

    return (
        <AdaptiveDialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <AdaptiveDialogContent>
                <AdaptiveDialogHeader className="bg-card">
                    <AdaptiveDialogTitle>
                        {isEditing
                            ? "Edit sync"
                            : "Add sync"}
                    </AdaptiveDialogTitle>

                    <AdaptiveDialogDescription>
                        Link a repository to a
                        category.
                    </AdaptiveDialogDescription>
                </AdaptiveDialogHeader>

                <AdaptiveDialogBody className="flex flex-col gap-4">
                    {/* ================= REPO ================= */}

                    <div className="flex flex-col gap-2">
                        <Label>
                            GitHub repository
                        </Label>

                        <ComboBox
                            value={
                                selectedRepo ||
                                undefined
                            }
                            onValueChange={
                                setSelectedRepo
                            }
                        >
                            <ComboBoxTrigger>
                                <ComboBoxValue placeholder="Select repository...">
                                    {selectedRepoName}
                                </ComboBoxValue>
                                <ComboBoxIcon />
                            </ComboBoxTrigger>

                            <ComboBoxContent>
                                <ComboBoxSearch />
                                <ComboBoxList>
                                    <ComboBoxEmpty>
                                        No repository available.
                                    </ComboBoxEmpty>

                                    <ComboBoxGroup>
                                        {availableRepos.map(
                                            (repo) => (
                                                <ComboBoxItem
                                                    key={
                                                        repo.id
                                                    }
                                                    value={repo.id.toString()}
                                                    searchValue={
                                                        repo.name
                                                    }
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <IconBrandGithub className="size-4" />
                                                        {
                                                            repo.full_name
                                                        }
                                                    </div>
                                                </ComboBoxItem>
                                            )
                                        )}
                                    </ComboBoxGroup>
                                </ComboBoxList>
                            </ComboBoxContent>
                        </ComboBox>
                    </div>

                    {/* ================= CATEGORY ================= */}

                    <div className="flex flex-col gap-2">
                        <Label>Category</Label>

                        <ComboBox
                            value={
                                selectedCategory ||
                                undefined
                            }
                            onValueChange={
                                setSelectedCategory
                            }
                        >
                            <ComboBoxTrigger>
                                <ComboBoxValue placeholder="Select category...">
                                    {selectedCategoryData && (
                                        <div className="flex items-center gap-2">
                                            <RenderIcon
                                                iconName={selectedCategoryData.icon || "IconCircleFilled"}
                                                size={12}
                                                color={selectedCategoryData.color || undefined}
                                                raw
                                            />
                                            <span>{selectedCategoryData.name}</span>
                                        </div>
                                    )}
                                </ComboBoxValue>
                                <ComboBoxIcon />
                            </ComboBoxTrigger>

                            <ComboBoxContent>
                                <ComboBoxSearch />
                                <ComboBoxList>
                                    <ComboBoxEmpty>
                                        No category available.
                                    </ComboBoxEmpty>

                                    <ComboBoxGroup>
                                        {availableCategories.map(
                                            (
                                                category
                                            ) => (
                                                <ComboBoxItem
                                                    key={
                                                        category.id
                                                    }
                                                    value={
                                                        category.id
                                                    }
                                                    searchValue={
                                                        category.name
                                                    }
                                                >
                                                    {
                                                        category.name
                                                    }
                                                </ComboBoxItem>
                                            )
                                        )}
                                    </ComboBoxGroup>
                                </ComboBoxList>
                            </ComboBoxContent>
                        </ComboBox>
                    </div>
                </AdaptiveDialogBody>

                <AdaptiveDialogFooter>
                    <AdaptiveDialogClose asChild>
                        <Button variant="outline">
                            Cancel
                        </Button>
                    </AdaptiveDialogClose>

                    <Button
                        disabled={isFetching || !selectedRepo || !selectedCategory}
                        onClick={async () => {
                            if (!selectedRepo || !selectedCategory) return;

                            /* ================= FIND REPO ================= */

                            const allRepos = githubInfos.flatMap(
                                (i) => i.repositories
                            );

                            const selectedRepoData = allRepos.find(
                                (r) => r.id.toString() === selectedRepo
                            );

                            if (!selectedRepoData) return;

                            const repoId = selectedRepoData.id;
                            const repoName = selectedRepoData.name;

                            /* ================= FIND INSTALLATION ================= */

                            const installation = githubInfos.find((info) =>
                                info.repositories.some(
                                    (repo: { id: any; }) => repo.id === repoId
                                )
                            );

                            if (!installation) return;

                            /* ================= EDIT MODE ================= */

                            if (isEditing) {
                                // ✅ prevent submit if nothing changed
                                if (
                                    repoId ===
                                    editingRepo.repoId &&
                                    selectedCategory ===
                                    editingRepo.categoryId
                                ) {
                                    onOpenChange(false);
                                    return;
                                }

                                const data =
                                    await runWithToast(
                                        "update-github-sync-connection",
                                        {
                                            loading: {
                                                title:
                                                    "Updating sync...",
                                                description:
                                                    "Please wait while we update the sync connection.",
                                            },
                                            success: {
                                                title:
                                                    "Sync updated",
                                                description:
                                                    "The sync connection has been successfully updated.",
                                            },
                                            error: {
                                                title:
                                                    "Failed to update sync",
                                                description:
                                                    "An error occurred while updating the sync connection.",
                                            },
                                        },
                                        () =>
                                            updateGithubSyncConnectionAction(organization.id,
                                                editingRepo.id,
                                                {
                                                    installationId: installation.installationId,
                                                    repoId,
                                                    repoName,
                                                    categoryId:
                                                        selectedCategory,
                                                }
                                            )
                                    );

                                if (data?.success) {
                                    queryClient.invalidateQueries({
                                        queryKey: ["organization", organization.id, "connections", "github"],
                                    });
                                    onOpenChange(false);
                                }

                                return;
                            }

                            /* ================= CREATE MODE ================= */

                            if (!installation) return;

                            const data = await runWithToast(
                                "create-github-sync-connection",
                                {
                                    loading: {
                                        title:
                                            "Creating sync connection...",
                                        description:
                                            "Please wait while we create the sync connection.",
                                    },
                                    success: {
                                        title:
                                            "Sync connection created",
                                        description:
                                            "The sync connection has been successfully created.",
                                    },
                                    error: {
                                        title:
                                            "Failed to create sync connection",
                                        description:
                                            "An error occurred while creating the sync connection.",
                                    },
                                },
                                () =>
                                    createGithubSyncConnectionAction(
                                        organization.id,
                                        {
                                            installationId:
                                                installation.installationId,
                                            repoId,
                                            repoName,
                                            categoryId:
                                                selectedCategory,
                                        }
                                    )
                            );

                            if (data?.success) {
                                queryClient.invalidateQueries({
                                    queryKey: ["organization", organization.id, "connections", "github"],
                                });
                                onOpenChange(false);
                            }
                        }}
                    >
                        {isEditing
                            ? "Save changes"
                            : "Create sync"}
                    </Button>
                </AdaptiveDialogFooter>
            </AdaptiveDialogContent>
        </AdaptiveDialog>
    );
}