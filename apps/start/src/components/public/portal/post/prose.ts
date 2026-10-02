/**
 * Maps Tailwind Typography's palette onto the portal tokens so rich text (the ProseKit read-only editor) follows
 * the portal theme in both light and dark. Use instead of `dark:prose-invert`.
 */
export const PORTAL_PROSE_VARS = [
	"[--tw-prose-body:var(--portal-fg)]",
	"[--tw-prose-headings:var(--portal-fg)]",
	"[--tw-prose-lead:var(--portal-fg-2)]",
	"[--tw-prose-links:var(--portal-accent-ink)]",
	"[--tw-prose-bold:var(--portal-fg)]",
	"[--tw-prose-counters:var(--portal-fg-3)]",
	"[--tw-prose-bullets:var(--portal-fg-3)]",
	"[--tw-prose-hr:var(--portal-line)]",
	"[--tw-prose-quotes:var(--portal-fg)]",
	"[--tw-prose-quote-borders:var(--portal-line-2)]",
	"[--tw-prose-captions:var(--portal-fg-3)]",
	"[--tw-prose-code:var(--portal-fg)]",
	"[--tw-prose-pre-code:var(--portal-fg)]",
	"[--tw-prose-pre-bg:var(--portal-raised)]",
	"[--tw-prose-th-borders:var(--portal-line-2)]",
	"[--tw-prose-td-borders:var(--portal-line)]",
].join(" ");

/** Body typography for a rendered comment (15/24), shared by comments, replies and the Latest update card. */
export const COMMENT_PROSE = `prose max-w-none text-[15px] leading-6 text-portal-fg prose-p:my-0 prose-p:leading-6 [&_.template-placeholder]:hidden ${PORTAL_PROSE_VARS}`;

/** Post description typography (16/28). Template placeholder text is hidden. */
export const DESCRIPTION_PROSE = `prose max-w-none text-base leading-7 text-portal-fg prose-headings:tracking-[-0.014em] prose-li:leading-7 prose-p:leading-7 [&_.template-placeholder]:hidden ${PORTAL_PROSE_VARS}`;
