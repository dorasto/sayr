import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@repo/ui/components/command";
import { DialogTitle } from "@repo/ui/components/dialog";
import { IconLoader2, IconRocket } from "@tabler/icons-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import * as React from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { statusConfig } from "@/components/tasks/shared/config";
import { extractHslValues } from "@repo/util";

const basePublicApiUrl =
  import.meta.env.VITE_APP_ENV === "development"
    ? "/backend-api/public/v1"
    : "/api/public/v1";

interface PublicRelease {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface PublicTaskResult {
  id: string;
  shortId: number;
  title: string;
  status: string;
}

interface PublicSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublicSearchDialog({
  open,
  onOpenChange,
}: PublicSearchDialogProps) {
  const { organization } = usePublicOrganizationLayout();
  const navigate = useNavigate();
  const rawPathname = useRouterState({ select: (s) => s.location.pathname });

  const orgSlugMatch = rawPathname.match(/^\/orgs\/([^/]+)/);
  const orgSlug = orgSlugMatch?.[1] ?? "";

  const [search, setSearch] = React.useState("");
  const [taskResults, setTaskResults] = React.useState<PublicTaskResult[]>([]);
  const [releases, setReleases] = React.useState<PublicRelease[]>([]);
  const [isSearchingTasks, setIsSearchingTasks] = React.useState(false);
  const [releasesLoaded, setReleasesLoaded] = React.useState(false);

  // Keyboard shortcut: "/" to open
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hijack "/" when typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  // Preload releases when dialog opens
  React.useEffect(() => {
    if (!open || releasesLoaded) return;
    const slug = organization.slug || orgSlug;
    fetch(`${basePublicApiUrl}/organization/${slug}/releases`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.data) {
          setReleases(data.data);
        }
        setReleasesLoaded(true);
      })
      .catch(() => setReleasesLoaded(true));
  }, [open, releasesLoaded, organization.slug, orgSlug]);

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSearch("");
        setTaskResults([]);
      }, 200);
    }
  }, [open]);

  // Debounced task search
  React.useEffect(() => {
    if (!open) return;
    if (search.length < 2) {
      setTaskResults([]);
      return;
    }

    const slug = organization.slug || orgSlug;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearchingTasks(true);
      try {
        const res = await fetch(
          `${basePublicApiUrl}/organization/${slug}/tasks?q=${encodeURIComponent(search)}&include_closed=true&limit=8`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (data?.data) {
          setTaskResults(data.data);
        }
      } catch {
        // aborted or failed — ignore
      } finally {
        setIsSearchingTasks(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, open, organization.slug, orgSlug]);

  // Client-side filter releases by search term
  const filteredReleases = React.useMemo(() => {
    if (!search) return releases.slice(0, 5);
    const lower = search.toLowerCase();
    return releases
      .filter((r) => r.name.toLowerCase().includes(lower))
      .slice(0, 5);
  }, [search, releases]);

  const hasTaskResults = taskResults.length > 0;
  const hasReleaseResults = filteredReleases.length > 0;
  const isEmpty =
    !isSearchingTasks &&
    !hasTaskResults &&
    !hasReleaseResults &&
    search.length >= 2;
  const isIdle = search.length < 2;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} showOverlay={false}>
      <DialogTitle className="sr-only">Search</DialogTitle>
      <CommandInput
        placeholder="Search tasks & releases..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {isEmpty && <CommandEmpty>No results found.</CommandEmpty>}
        {isIdle && !hasReleaseResults && (
          <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
        )}

        {isSearchingTasks && !hasTaskResults && search.length >= 2 && (
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
            <IconLoader2 className="h-4 w-4 animate-spin" />
            <span>Searching tasks...</span>
          </div>
        )}

        {hasTaskResults && (
          <>
            <CommandGroup heading="Tasks">
              {taskResults.map((task) => (
                <CommandItem
                  key={task.id}
                  value={`task-${task.id}`}
                  keywords={[task.title, String(task.shortId)]}
                  onSelect={() => {
                    navigate({ to: `/orgs/${orgSlug}/${task.shortId}` });
                    onOpenChange(false);
                  }}
                >
                  {(() => {
                    const status = statusConfig[task.status as keyof typeof statusConfig];
                    return status ? (
                      <span
                        className="flex shrink-0 items-center justify-center rounded size-5"
                        style={{ background: `hsla(${extractHslValues(status.hsla)}, 0.1)` }}
                      >
                        {status.icon(`${status.className} size-3.5`)}
                      </span>
                    ) : null;
                  })()}
                  <span className="truncate">{task.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    #{task.shortId}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {hasReleaseResults && <CommandSeparator />}
          </>
        )}

        {hasReleaseResults && (
          <CommandGroup heading="Releases">
            {filteredReleases.map((release) => (
              <CommandItem
                key={release.id}
                value={`release-${release.id}`}
                keywords={[release.name, release.status]}
                onSelect={() => {
                  navigate({ to: `/orgs/${orgSlug}/releases/${release.slug}` });
                  onOpenChange(false);
                }}
              >
                <IconRocket className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{release.name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground capitalize">
                  {release.status}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      <div className="flex items-center justify-between border-t bg-accent/50 px-3 py-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">
            /
          </kbd>
          <span>to search</span>
        </div>
      </div>
    </CommandDialog>
  );
}
