import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { IconLoader2 } from "@tabler/icons-react";

/**
 * NavigationSpinner shows a loading spinner during hard navigations (path changes),
 * but not during query parameter changes.
 *
 * Alternative to NavigationProgress that shows a spinner instead of a progress bar.
 */
export function NavigationSpinner() {
  const [isVisible, setIsVisible] = useState(false);
  const previousPathRef = useRef<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Track navigation state
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  // Detect if this is a hard navigation (path change) vs soft navigation (query params only)
  const isHardNavigation =
    isLoading &&
    previousPathRef.current !== "" &&
    previousPathRef.current !== currentPath;

  useEffect(() => {
    // Track path changes
    if (!isLoading) {
      previousPathRef.current = currentPath;
    }
  }, [currentPath, isLoading]);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Show loading spinner only for hard navigations
    if (isLoading && isHardNavigation) {
      // Add a small delay before showing spinner to avoid flash on fast navigations
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 100);
    } else if (!isLoading) {
      // Hide immediately when loading completes
      setIsVisible(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, isHardNavigation]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-9999 bg-background/10 backdrop-blur-sm rounded-lg p-3 shadow-lg h-full w-full">
      <IconLoader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  );
}
