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
import { IconLoader2 } from "@tabler/icons-react";
import {
  searchOrgTasks,
  type OrgTaskSearchResult,
} from "@/lib/fetches/searchTasks";
import { statusConfig } from "./config";

const DEBOUNCE_MS = 300;

interface TaskPickerProps {
  /** Organization ID — used for server-side search */
  organizationId: string;
  /** Currently selected task ID (if any) */
  value?: string | null;
  /** Called when a task is selected */
  onSelect: (task: OrgTaskSearchResult) => void;
  /** Task IDs to exclude from the results (e.g., the current task itself) */
  excludeIds?: string[];
  /** Client-side filter applied after server results arrive */
  filter?: (task: OrgTaskSearchResult) => boolean;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Placeholder text when no task is selected */
  placeholder?: string;
  /** Open state (controlled) */
  open?: boolean;
  /** Open change handler (controlled) */
  onOpenChange?: (open: boolean) => void;
  /** Custom trigger element (renders as child of ComboBoxTrigger asChild) */
  customTrigger?: React.ReactNode;
  /** Whether the trigger is interactive */
  editable?: boolean;
  /** Additional className for the trigger */
  className?: string;
}

/**
 * Reusable task picker popover with server-side search.
 * Shows recent tasks when opened (no query), then debounced search on input.
 * Used for selecting parent tasks, relation targets, etc.
 */
export default function TaskPicker({
  organizationId,
  value,
  onSelect,
  excludeIds = [],
  filter,
  searchPlaceholder = "Search tasks...",
  placeholder = "Select task",
  open,
  onOpenChange,
  customTrigger,
  editable = true,
  className,
}: TaskPickerProps) {
  const [results, setResults] = useState<OrgTaskSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(
    async (searchQuery: string, signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const data = await searchOrgTasks(
          organizationId,
          searchQuery,
          20,
          0,
          signal,
        );
        if (!signal?.aborted) {
          setResults(data);
        }
      } catch {
        // Ignore aborted requests / network errors
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [organizationId],
  );

  // Fetch recent tasks when popover opens
  useEffect(() => {
    if (open) {
      // Cancel any pending debounce/request
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();

      const controller = new AbortController();
      abortRef.current = controller;
      setQuery("");
      fetchResults("", controller.signal);
    } else {
      // Clean up on close
      setResults([]);
      setQuery("");
      setIsLoading(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    }
  }, [open, fetchResults]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setQuery(value);

      // Cancel any in-flight request
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const controller = new AbortController();
      abortRef.current = controller;

      debounceRef.current = setTimeout(() => {
        fetchResults(value, controller.signal);
      }, DEBOUNCE_MS);
    },
    [fetchResults],
  );

  // Apply client-side exclusions and filters
  const excludeSet = new Set(excludeIds);
  const filteredResults = results.filter((t) => {
    if (excludeSet.has(t.id)) return false;
    if (filter && !filter(t)) return false;
    return true;
  });

  const handleChange = (taskId: string | null) => {
    if (!taskId) return;
    const task = results.find((t) => t.id === taskId);
    if (task) {
      onSelect(task);
    }
  };

  return (
    <ComboBox
      value={value || ""}
      onValueChange={handleChange}
      open={open}
      onOpenChange={onOpenChange}
    >
      {customTrigger ? (
        <ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
      ) : (
        <ComboBoxTrigger disabled={!editable} className={className}>
          <ComboBoxValue placeholder={placeholder}>
            <span className="text-muted-foreground">{placeholder}</span>
          </ComboBoxValue>
        </ComboBoxTrigger>
      )}

      <ComboBoxContent shouldFilter={false}>
        <ComboBoxSearch
          icon
          placeholder={searchPlaceholder}
          onValueChange={handleSearchChange}
        />
        <ComboBoxList>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filteredResults.length === 0 ? (
            <ComboBoxEmpty>
              {query.length > 0 ? "No tasks found" : "No recent tasks"}
            </ComboBoxEmpty>
          ) : (
            <ComboBoxGroup>
              {filteredResults.map((t) => (
                <ComboBoxItem key={t.id} value={t.id}>
                  <TaskPickerItem task={t} />
                </ComboBoxItem>
              ))}
            </ComboBoxGroup>
          )}
        </ComboBoxList>
      </ComboBoxContent>
    </ComboBox>
  );
}

/** Compact task display for picker items and selected values */
export function TaskPickerItem({
  task,
  className: itemClassName,
}: {
  task: { shortId?: number | null; title?: string | null; status: string };
  className?: string;
}) {
  const config = statusConfig[task.status as keyof typeof statusConfig];
  return (
    <div className={cn("flex items-center gap-2 min-w-0", itemClassName)}>
      {config?.icon("h-3.5 w-3.5 shrink-0")}

      <span className="truncate text-xs">{task.title ?? "Untitled"}</span>
      {task.shortId != null && (
        <span className="text-muted-foreground text-xs shrink-0">
          #{task.shortId}
        </span>
      )}
    </div>
  );
}
