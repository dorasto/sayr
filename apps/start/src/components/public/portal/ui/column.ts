/**
 * A portal page's body, nested in the page's scroll area (the same pattern as the admin pages' `max-w-* mx-auto`
 * content block). The site header, the board's page bar and any side panel run the full available width; only the
 * body is constrained, and it centres in whatever space the panel leaves. Pages that are deliberately narrower (the
 * post article, the new-post form) set their own width instead.
 */
export const PORTAL_BODY = "mx-auto w-full max-w-[1120px] px-4 md:px-6";
