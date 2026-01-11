"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useSticky - Detects when a sticky element is actually "stuck"
 *
 * Usage:
 *   const { stuck, stickyRef } = useSticky()
 *   return <header ref={stickyRef} className="sticky top-0">
 *     {stuck ? "I'm stuck!" : "Not stuck yet"}
 *   </header>
 *
 * Works by listening to scroll events on the scroll container and checking
 * if the element is at the top of its container (stuck position).
 */
export function useSticky() {
  const [stuck, setStuck] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const stickyRef = useCallback((node: HTMLElement | null) => {
    // Clean up previous listener if exists
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (!node) {
      return;
    }

    // Find the nearest scroll container
    const findScrollParent = (el: HTMLElement): HTMLElement | null => {
      let parent = el.parentElement;
      while (parent) {
        const { overflow, overflowY } = window.getComputedStyle(parent);
        if (
          overflow === "auto" ||
          overflow === "scroll" ||
          overflowY === "auto" ||
          overflowY === "scroll"
        ) {
          return parent;
        }
        parent = parent.parentElement;
      }
      return null;
    };

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const scrollContainer = findScrollParent(node);
      if (!scrollContainer) {
        return;
      }

      const checkSticky = () => {
        const rect = node.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();

        // Get the computed 'top' value of the sticky element
        const computedStyle = window.getComputedStyle(node);
        const stickyTop = parseFloat(computedStyle.top) || 0;

        // Element is stuck when it's at its sticky position (container top + sticky top offset)
        // Use a small threshold (+1) to account for sub-pixel rounding
        const isStuck = rect.top <= containerRect.top + stickyTop + 1;

        setStuck(isStuck);
      };

      // Attach scroll listener with passive flag for better performance
      scrollContainer.addEventListener("scroll", checkSticky, {
        passive: true,
      });

      // Run initial check
      checkSticky();

      // Store cleanup function
      cleanupRef.current = () => {
        scrollContainer.removeEventListener("scroll", checkSticky);
      };
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return { stuck, stickyRef };
}
