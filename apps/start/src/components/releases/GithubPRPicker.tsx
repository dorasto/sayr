"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ComboBox,
  ComboBoxContent,
  ComboBoxEmpty,
  ComboBoxGroup,
  ComboBoxItem,
  ComboBoxList,
  ComboBoxSearch,
  ComboBoxTrigger,
  ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import { cn } from "@repo/ui/lib/utils";
import { IconLoader2, IconGitPullRequest } from "@tabler/icons-react";
import { Badge } from "@repo/ui/components/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { linkGithubPRToReleaseAction, unlinkGithubPRFromReleaseAction } from "@/lib/fetches/release";
import { useToastAction } from "@/lib/util";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { getGithubPRsAction } from "@/lib/fetches/organization";

interface GithubPR {
  id: number;
  node_id: string;
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  created_at: string;
  updated_at: string;
  merge_commit_sha: string | null;
  base: {
    ref: string;
    sha: string;
    repo: {
      id: number;
    };
  };
  head: {
    ref: string;
    sha: string;
    repo: {
      name: string;
    };
  };
  merged_at?: string | null;
}

interface GithubPRPickerProps {
  organizationId: string;
  releaseId: string;
  /** Currently linked GitHub PR (only one allowed) */
  linkedPR: any | null;
  /** Called when a PR is linked */
  onLinkPR: (pr: any) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Variant: 'standalone' for original usage, 'sidebar' for toolbar integration */
  variant?: "standalone" | "sidebar";
  /** Custom trigger element to use instead of the default trigger */
  customTrigger?: React.ReactNode;
}

export default function GithubPRPicker({
  organizationId,
  releaseId,
  linkedPR,
  onLinkPR,
  disabled = false,
  variant = "standalone",
  customTrigger,
}: GithubPRPickerProps) {
  const [open, onOpenChange] = useState(false);
  const [results, setResults] = useState<GithubPR[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { runWithToast } = useToastAction();
  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
  const [repositories, setRepositories] = useState<
    Record<number, { id: string; installationId: string }>
  >({});

  // Fetch repositories for the organization
  useEffect(() => {
    async function fetchRepositories() {
      try {
        const response = await fetch(
          `/backend-api/internal/v1/admin/organization/${organizationId}/connections/github`,
          {
            credentials: "include",
          },
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const repoMap: Record<
              number,
              { id: string; installationId: string }
            > = {};
            data.data.repositories.forEach((repo: any) => {
              repoMap[repo.repoId] = {
                id: repo.id,
                installationId: repo.installationId,
              };
            });
            setRepositories(repoMap);
          }
        }
      } catch (error) {
        console.error("Failed to fetch repositories:", error);
      }
    }
    if (open) {
      fetchRepositories();
    }
  }, [open, organizationId]);

  const fetchResults = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const result = await getGithubPRsAction(organizationId);
        if (!signal?.aborted && result.success) {
          // Filter out already linked PR (only one allowed)
          const linkedPRNumber = linkedPR?.prNumber;
          setResults(
            result.data.filter((pr: GithubPR) => pr.number !== linkedPRNumber),
          );
        }
      } catch (error) {
        console.error("Failed to fetch GitHub PRs:", error);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [organizationId, linkedPR],
  );

  // Fetch PRs when popover opens
  useEffect(() => {
    if (open) {
      // Cancel any pending debounce/request
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();

      const controller = new AbortController();
      abortRef.current = controller;
      fetchResults(controller.signal);
    } else {
      // Clean up on close
      setResults([]);
      setQuery("");
      setIsLoading(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    }
  }, [open, fetchResults]);

  const handleSearchChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const handleLinkPR = useCallback(
    async (pr: GithubPR) => {
      setIsLoading(true);
      try {
        const repoInfo = repositories[pr.base.repo.id];
        if (!repoInfo) {
          console.error("Repository not found in mapping:", pr.base.repo.id);
          return;
        }

        // Extract branch information from the PR
        const headBranch = pr.head?.ref || "unknown";
        const baseBranch = pr.base?.ref || "main";
        const headSha = pr.head?.sha || "";
        linkedPR?.id && await unlinkGithubPRFromReleaseAction(organizationId, releaseId, linkedPR.id);

        const result = await runWithToast(
          "link-github-pr",
          {
            loading: {
              title: "Linking PR...",
              description: `Linking PR #${pr.number} to release.`,
            },
            success: {
              title: "PR linked",
              description: `PR #${pr.number} has been linked to this release.`,
            },
            error: {
              title: "Failed to link PR",
              description: "Could not link the GitHub PR to this release.",
            },
          },
          () =>
            linkGithubPRToReleaseAction(
              organizationId,
              releaseId,
              {
                prNumber: pr.number,
                prUrl: pr.html_url,
                title: pr.title,
                body: null,
                headSha: headSha,
                baseBranch: baseBranch,
                headBranch: headBranch,
                state: pr.state,
                merged: !!pr.merged_at,
                mergeCommitSha: pr.merge_commit_sha ?? null,
                repositoryId: repoInfo.id,
              },
              sseClientId,
            ),
        );

        if (result?.success && result.data) {
          onLinkPR(result.data);
        }
      } catch (error) {
        console.error("Failed to link GitHub PR:", error);
      } finally {
        setIsLoading(false);
        onOpenChange?.(false);
      }
    },
    [
      organizationId,
      releaseId,
      sseClientId,
      runWithToast,
      onLinkPR,
      repositories,
      onOpenChange,
    ],
  );

  // Filter results based on search query
  const filteredResults = query
    ? results.filter(
      (pr) =>
        pr.title.toLowerCase().includes(query.toLowerCase()) ||
        pr.number.toString().includes(query) ||
        pr.user.login.toLowerCase().includes(query.toLowerCase()) ||
        pr.head.repo.name.toLowerCase().includes(query.toLowerCase()),
    )
    : results;

  // Render different variants
  if (variant === "sidebar") {
    return (
      <ComboBox open={open} onOpenChange={onOpenChange}>
        <ComboBoxTrigger asChild disabled={disabled}>
          {customTrigger ?? (
            <Button
              variant="primary"
              size="sm"
              className={cn(
                "border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit",
                linkedPR ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <IconGitPullRequest className="w-3 h-3" />
              {linkedPR ? `PR #${linkedPR.prNumber}` : "Link GitHub PR"}
            </Button>
          )}
        </ComboBoxTrigger>

        <ComboBoxContent shouldFilter={false} className="">
          <ComboBoxSearch
            // icon={<IconGitPullRequest className="h-4 w-4" />}
            placeholder="Search GitHub PRs..."
            onValueChange={handleSearchChange}
          />
          <ComboBoxList>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredResults.length === 0 ? (
              <ComboBoxEmpty>
                {query.length > 0 ? "No PRs found" : "No GitHub PRs available"}
              </ComboBoxEmpty>
            ) : (
              <ComboBoxGroup>
                {filteredResults.map((pr) => (
                  <ComboBoxItem
                    key={pr.id}
                    value={pr.node_id}
                    onSelect={() => handleLinkPR(pr)}
                  >
                    <div className="flex items-center gap-3 p-1">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={pr.user.avatar_url}
                          alt={pr.user.login}
                        />
                        <AvatarFallback>
                          {pr.user.login.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {pr.head.repo.name}
                          </span>
                          <span className="font-medium text-sm truncate">
                            #{pr.number}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {pr.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {pr.user.login}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "h-4 text-xs",
                              pr.state === "open"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800",
                            )}
                          >
                            {pr.state}
                          </Badge>
                          {pr.merged_at && (
                            <Badge
                              variant="secondary"
                              className="h-4 text-xs bg-purple-100 text-purple-800"
                            >
                              Merged
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </ComboBoxItem>
                ))}
              </ComboBoxGroup>
            )}
          </ComboBoxList>
        </ComboBoxContent>
      </ComboBox>
    );
  }

  // Default standalone variant
  return (
    <ComboBox open={open} onOpenChange={onOpenChange}>
      <ComboBoxTrigger disabled={disabled}>
        <ComboBoxValue placeholder="Link GitHub PR">
          <div className="flex items-center gap-2">
            <IconGitPullRequest className="h-4 w-4" />
            <span>Link GitHub PR</span>
          </div>
        </ComboBoxValue>
      </ComboBoxTrigger>

      <ComboBoxContent shouldFilter={false} className="w-[300px]">
        <ComboBoxSearch
          icon={<IconGitPullRequest className="h-4 w-4" />}
          placeholder="Search GitHub PRs..."
          onValueChange={handleSearchChange}
        />
        <ComboBoxList>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filteredResults.length === 0 ? (
            <ComboBoxEmpty>
              {query.length > 0 ? "No PRs found" : "No GitHub PRs available"}
            </ComboBoxEmpty>
          ) : (
            <ComboBoxGroup>
              {filteredResults.map((pr) => (
                <ComboBoxItem
                  key={pr.id}
                  value={pr.node_id}
                  onSelect={() => handleLinkPR(pr)}
                >
                  <div className="flex items-center gap-3 p-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={pr.user.avatar_url}
                        alt={pr.user.login}
                      />
                      <AvatarFallback>
                        {pr.user.login.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {pr.head.repo.name}
                        </span>
                        <span className="font-medium text-sm truncate">
                          #{pr.number}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {pr.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {pr.user.login}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-4 text-xs",
                            pr.state === "open"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800",
                          )}
                        >
                          {pr.state}
                        </Badge>
                        {pr.merged_at && (
                          <Badge
                            variant="secondary"
                            className="h-4 text-xs bg-purple-100 text-purple-800"
                          >
                            Merged
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </ComboBoxItem>
              ))}
            </ComboBoxGroup>
          )}
        </ComboBoxList>
      </ComboBoxContent>
    </ComboBox>
  );
}
