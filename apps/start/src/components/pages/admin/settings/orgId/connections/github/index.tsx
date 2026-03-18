import { useEffect, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
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
import {
  createGithubSyncConnectionAction,
  deleteGithubSyncConnectionAction,
  toggleGithubSyncConnectionAction,
  unlinkGithubInstallationAction,
  updateGithubSyncConnectionAction,
} from "@/lib/fetches/organization";
import { useToastAction } from "@/lib/util";
import { useQueryClient } from "@tanstack/react-query";
import { useLayoutData } from "@/components/generic/Context";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";

export type githubConnections = Array<{
  installation: {
    id: string;
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
  repositories: githubConnectionsRepositories;
  isLoading?: boolean;
}

export default function SettingsOrganizationConnectionsGitHubPage({
  githubConnections,
  repositories,
  isLoading,
}: Props) {
  const { serverEvents } = useLayoutData();
  const { organization, setOrganization } = useLayoutOrganizationSettings();
  useServerEventsSubscription({
    serverEvents,
    orgId: organization.id,
    organization: organization,
    channel: "admin",
    setOrganization: setOrganization,
  });
  return (
    <div className="flex flex-col gap-6">
      <InstallationsSection
        githubConnections={githubConnections}
        organizationId={organization.id}
        isLoading={isLoading}
      />
      <TaskSyncSection
        githubConnections={githubConnections}
        repositories={repositories}
        isLoading={isLoading}
      />
    </div>
  );
}

/* ================= INSTALLATIONS ================= */

function InstallationsSection({
  githubConnections,
  organizationId,
  isLoading,
}: {
  githubConnections: githubConnections;
  organizationId: string;
  isLoading?: boolean;
}) {
  const { runWithToast } = useToastAction();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg flex flex-col">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 animate-pulse"
          >
            {/* Left section */}
            <div className="flex items-center gap-4 flex-1">
              {/* Avatar */}
              <div className="h-10 w-10 rounded-md bg-muted-foreground/10" />

              {/* Text */}
              <div className="flex flex-col gap-2 flex-1">
                {/* Title */}
                <div className="h-4 w-32 bg-muted-foreground/10 rounded" />

                {/* Description */}
                <div className="h-3 w-56 bg-muted-foreground/10 rounded" />
              </div>
            </div>

            {/* Right action (dots) */}
            <div className="h-8 w-8 bg-muted-foreground/10 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

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
                        src={info.account.avatar_url || ""}
                        alt={info.account.login}
                      />
                      <AvatarFallback>
                        <IconUsers className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                  </TileIcon>

                  <TileTitle>{info.account.login}</TileTitle>

                  <TileDescription>
                    Connected by {info.joinUserName} –{" "}
                    {formatDateTime(new Date(info.createdAt))}
                  </TileDescription>
                </TileHeader>

                <TileAction>
                  <Button variant="ghost" size="icon">
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
              <DropdownMenuItem asChild>
                <div
                  onClick={async () => {
                    const ok = window.confirm(
                      `Remove "${info.account.login}" from this organization?\n\nThis removes all linked repositories in Sayr.\n\nTo uninstall the GitHub App completely, use GitHub settings or click Configure.`,
                    );

                    if (!ok) return;

                    await runWithToast(
                      "unlink-github-installation",
                      {
                        loading: { title: "Removing installation..." },
                        success: { title: "Installation removed" },
                        error: { title: "Failed to remove installation" },
                      },
                      () =>
                        unlinkGithubInstallationAction(
                          organizationId,
                          connection.installation.installationId,
                        ),
                    );

                    queryClient.invalidateQueries({
                      queryKey: [
                        "organization",
                        organizationId,
                        "connections",
                        "github",
                      ],
                    });
                  }}
                >
                  <IconX /> Remove
                </div>
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
  repositories,
  isLoading,
}: {
  githubConnections: githubConnections;
  repositories: githubConnectionsRepositories;
  isLoading?: boolean;
}) {
  const { categories, organization } = useLayoutOrganizationSettings();
  const { runWithToast, isFetching } = useToastAction();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const githubInfos = githubConnections.map((c) => c.githubInfo);

  const editingRepo = repositories.find((r) => r.id === editingId);
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg flex flex-col">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 animate-pulse"
          >
            {/* Left */}
            <div className="flex flex-col gap-2 flex-1">
              {/* Repo name */}
              <div className="h-4 w-32 bg-muted-foreground/10 rounded" />

              {/* Category + date */}
              <div className="h-3 w-56 bg-muted-foreground/10 rounded" />
            </div>

            {/* Right status button */}
            <div className="h-8 w-24 bg-muted-foreground/10 rounded-md" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <Label variant={"heading"}>Task syncing</Label>
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
        {repositories.map((repo) => {
           const connection = githubConnections.find(
            (c) => c.installation.installationId === repo.installationId,
          );
          const ownerLogin = connection?.githubInfo.account.login;
          const ownerAvatar = connection?.githubInfo.account.avatar_url;

          return (
          <DropdownMenu key={repo.id}>
            <DropdownMenuTrigger asChild>
              <Tile variant="transparent" className="hover:bg-accent w-full!">
                <TileHeader>
                  <TileIcon className="bg-transparent">
                    <Avatar className="h-10 w-10 rounded-md">
                      <AvatarImage
                        src={ownerAvatar || ""}
                        alt={ownerLogin || repo.repoName}
                      />
                      <AvatarFallback>
                        <IconBrandGithub className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                  </TileIcon>
                  <TileTitle>{ownerLogin ? `${ownerLogin}/${repo.repoName}` : repo.repoName}</TileTitle>

                  <TileDescription>
                    {categories.find((e) => e.id === repo.categoryId)?.name ||
                      "All categories"}{" "}
                    – {formatDateTime(new Date(repo.createdAt))}
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
                        repo.enabled ? "text-success" : "text-muted-foreground"
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
                        title: nextState ? "Sync enabled" : "Sync disabled",
                      },
                      error: {
                        title: "Failed to update sync status",
                      },
                    },
                    () =>
                      toggleGithubSyncConnectionAction(
                        organization.id,
                        repo.id,
                        nextState,
                      ),
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
                    repo.enabled ? "text-success" : "text-muted-foreground"
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
          );
        })}

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
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AdaptiveDialogContent>
          <AdaptiveDialogHeader className="bg-card">
            <AdaptiveDialogTitle>Remove sync</AdaptiveDialogTitle>
            <AdaptiveDialogDescription>
              Are you sure you want to remove this GitHub sync?
            </AdaptiveDialogDescription>
          </AdaptiveDialogHeader>

          <AdaptiveDialogFooter>
            <AdaptiveDialogClose asChild>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
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
                      title: "Deleting sync...",
                      description:
                        "Please wait while we remove the sync connection.",
                    },
                    success: {
                      title: "Sync removed",
                      description:
                        "The sync connection has been successfully removed.",
                    },
                    error: {
                      title: "Failed to remove sync",
                      description:
                        "An error occurred while removing the sync connection.",
                    },
                  },
                  () =>
                    deleteGithubSyncConnectionAction(organization.id, deleteId),
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

  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  /* ================= RESET + PREFILL ================= */

  useEffect(() => {
    if (!open) return;

    if (editingRepo) {
      setSelectedRepo(editingRepo.repoId?.toString() || null);

      setSelectedCategory(editingRepo.categoryId ?? "__none__");
    } else {
      setSelectedRepo(null);
      setSelectedCategory("__none__");
    }
  }, [editingRepo, open]);

  /* ================= BLOCK USED REPOS ================= */

  const usedRepoIds = new Set(
    allSyncedRepos
      .filter((r) => (isEditing ? r.id !== editingRepo?.id : true))
      .map((r) => r.repoId),
  );

  const allRepos = githubInfos.flatMap((i) => i.repositories);

  const availableRepos = allRepos.filter((r) => !usedRepoIds.has(r.id));

  /* ================= BLOCK USED CATEGORIES ================= */
  const otherRepos = allSyncedRepos.filter((r) =>
    isEditing ? r.id !== editingRepo?.id : true,
  );
  const usedCategoryIds = new Set(
    otherRepos.map((r) => r.categoryId).filter(Boolean), // remove null
  );
  const hasUnassignedAlready = otherRepos.some((r) => !r.categoryId);
  const availableCategories = categories.filter(
    (c) => !usedCategoryIds.has(c.id) || c.id === editingRepo?.categoryId,
  );
  /* ================= DISPLAY NAME ================= */

  const selectedRepoName = allRepos.find(
    (r) => r.id.toString() === selectedRepo,
  )?.full_name;

  const selectedCategoryData =
    selectedCategory === "__none__"
      ? { name: "No category" }
      : categories.find((c) => c.id === selectedCategory);

  const finalCategoryId =
    selectedCategory === "__none__" ? null : selectedCategory;

  const isUnchanged =
    isEditing &&
    selectedRepo === editingRepo?.repoId?.toString() &&
    finalCategoryId === editingRepo?.categoryId;
  /* ================= UI ================= */

  return (
    <AdaptiveDialog open={open} onOpenChange={onOpenChange}>
      <AdaptiveDialogContent>
        <AdaptiveDialogHeader className="bg-card">
          <AdaptiveDialogTitle>
            {isEditing ? "Edit sync" : "Add sync"}
          </AdaptiveDialogTitle>

          <AdaptiveDialogDescription>
            Link a repository to a category.
          </AdaptiveDialogDescription>
        </AdaptiveDialogHeader>

        <AdaptiveDialogBody className="flex flex-col gap-4">
          {/* ================= REPO ================= */}

          <div className="flex flex-col gap-2">
            <Label>GitHub repository</Label>

            <ComboBox
              value={selectedRepo || undefined}
              onValueChange={setSelectedRepo}
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
                  <ComboBoxEmpty>No repository available.</ComboBoxEmpty>

                  <ComboBoxGroup>
                    {availableRepos.map((repo) => (
                      <ComboBoxItem
                        key={repo.id}
                        value={repo.id.toString()}
                        searchValue={repo.name}
                      >
                        <div className="flex items-center gap-2">
                          <IconBrandGithub className="size-4" />
                          {repo.full_name}
                        </div>
                      </ComboBoxItem>
                    ))}
                  </ComboBoxGroup>
                </ComboBoxList>
              </ComboBoxContent>
            </ComboBox>
          </div>

          {/* ================= CATEGORY ================= */}

          <div className="flex flex-col gap-2">
            <Label>Category</Label>

            <ComboBox
              value={selectedCategory || undefined}
              onValueChange={setSelectedCategory}
            >
              <ComboBoxTrigger>
                <ComboBoxValue placeholder="Select category...">
                  {selectedCategoryData && (
                    <div className="flex items-center gap-2">
                      <RenderIcon
                        iconName={
                          selectedCategoryData.icon || "IconCircleFilled"
                        }
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
                  <ComboBoxEmpty>No category available.</ComboBoxEmpty>

                  <ComboBoxGroup>
                    <ComboBoxItem searchValue={"No category"} value="__none__">
                      No category
                    </ComboBoxItem>
                    {availableCategories.map((category) => (
                      <ComboBoxItem
                        key={category.id}
                        value={category.id}
                        searchValue={category.name}
                      >
                        {category.name}
                      </ComboBoxItem>
                    ))}
                  </ComboBoxGroup>
                </ComboBoxList>
              </ComboBoxContent>
            </ComboBox>
          </div>
        </AdaptiveDialogBody>

        <AdaptiveDialogFooter>
          <AdaptiveDialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </AdaptiveDialogClose>

          <Button
            disabled={
              isFetching ||
              !selectedRepo ||
              (selectedCategory === "__none__" && hasUnassignedAlready) ||
              isUnchanged
            }
            onClick={async () => {
              if (selectedCategory === "__none__" && hasUnassignedAlready) {
                return; // optionally show toast error
              }
              if (!selectedRepo) return;

              /* ================= FIND REPO ================= */

              const allRepos = githubInfos.flatMap((i) => i.repositories);

              const selectedRepoData = allRepos.find(
                (r) => r.id.toString() === selectedRepo,
              );

              if (!selectedRepoData) return;

              const repoId = selectedRepoData.id;
              const repoName = selectedRepoData.name;

              /* ================= FIND INSTALLATION ================= */

              const installation = githubInfos.find((info) =>
                info.repositories.some(
                  (repo: { id: any }) => repo.id === repoId,
                ),
              );

              if (!installation) return;

              /* ================= EDIT MODE ================= */

              if (isEditing) {
                // ✅ prevent submit if nothing changed
                if (
                  repoId === editingRepo.repoId &&
                  finalCategoryId === editingRepo.categoryId
                ) {
                  onOpenChange(false);
                  return;
                }

                const data = await runWithToast(
                  "update-github-sync-connection",
                  {
                    loading: {
                      title: "Updating sync...",
                      description:
                        "Please wait while we update the sync connection.",
                    },
                    success: {
                      title: "Sync updated",
                      description:
                        "The sync connection has been successfully updated.",
                    },
                    error: {
                      title: "Failed to update sync",
                      description:
                        "An error occurred while updating the sync connection.",
                    },
                  },
                  () =>
                    updateGithubSyncConnectionAction(
                      organization.id,
                      editingRepo.id,
                      {
                        installationId: installation.installationId,
                        repoId,
                        repoName,
                        categoryId: finalCategoryId,
                      },
                    ),
                );

                if (data?.success) {
                  queryClient.invalidateQueries({
                    queryKey: [
                      "organization",
                      organization.id,
                      "connections",
                      "github",
                    ],
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
                    title: "Creating sync connection...",
                    description:
                      "Please wait while we create the sync connection.",
                  },
                  success: {
                    title: "Sync connection created",
                    description:
                      "The sync connection has been successfully created.",
                  },
                  error: {
                    title: "Failed to create sync connection",
                    description:
                      "An error occurred while creating the sync connection.",
                  },
                },
                () =>
                  createGithubSyncConnectionAction(organization.id, {
                    installationId: installation.installationId,
                    repoId,
                    repoName,
                    categoryId: selectedCategory,
                  }),
              );

              if (data?.success) {
                queryClient.invalidateQueries({
                  queryKey: [
                    "organization",
                    organization.id,
                    "connections",
                    "github",
                  ],
                });
                onOpenChange(false);
              }
            }}
          >
            {isEditing ? "Save changes" : "Create sync"}
          </Button>
        </AdaptiveDialogFooter>
      </AdaptiveDialogContent>
    </AdaptiveDialog>
  );
}
