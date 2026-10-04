/**
 * Maps Tailwind Typography's palette onto the shared admin tokens so rich text (the ProseKit read-only editor) follows
 * the theme in both light and dark. Use instead of `dark:prose-invert`.
 */
const PROSE_VARS = [
	"[--tw-prose-body:var(--foreground)]",
	"[--tw-prose-headings:var(--foreground)]",
	"[--tw-prose-lead:var(--muted-foreground)]",
	"[--tw-prose-links:var(--primary)]",
	"[--tw-prose-bold:var(--foreground)]",
	"[--tw-prose-counters:var(--muted-foreground)]",
	"[--tw-prose-bullets:var(--muted-foreground)]",
	"[--tw-prose-hr:var(--border)]",
	"[--tw-prose-quotes:var(--foreground)]",
	"[--tw-prose-quote-borders:var(--border)]",
	"[--tw-prose-captions:var(--muted-foreground)]",
	"[--tw-prose-code:var(--foreground)]",
	"[--tw-prose-pre-code:var(--foreground)]",
	"[--tw-prose-pre-bg:var(--muted)]",
	"[--tw-prose-th-borders:var(--border)]",
	"[--tw-prose-td-borders:var(--border)]",
].join(" ");

/**
 * The editor's own (unlayered) `.ProseMirror p` rule pads every block by 0.5rem, which would sit above the first line
 * and below the last; `!` is needed to beat an unlayered rule.
 */
const TRIM_EDGE_BLOCKS = "[&_.ProseMirror>:first-child]:pt-0! [&_.ProseMirror>:last-child]:pb-0!";

/** Body typography for a rendered comment (15/24), shared by comments, replies and the Latest update card. */
export const COMMENT_PROSE = `prose max-w-none text-[15px] leading-6 text-foreground prose-p:my-0 prose-p:leading-6 [&_.template-placeholder]:hidden ${TRIM_EDGE_BLOCKS} ${PROSE_VARS}`;

/**
 * Heading sizes inside rich text, kept below the page's own `text-2xl` title. `!` is needed because the global `h1`-`h4`
 * rules in `packages/ui/src/globals.css` are unlayered and would otherwise beat Typography's sizes.
 */
const PROSE_HEADINGS =
	"[&_h1]:text-xl! [&_h2]:text-lg! [&_h3]:text-base! [&_h4]:text-base! [&_:is(h1,h2,h3,h4)]:font-semibold! [&_:is(h1,h2,h3,h4)]:leading-snug!";

/** Post description typography (16/28). Template placeholder text is hidden. */
export const DESCRIPTION_PROSE = `prose max-w-none text-base leading-7 text-foreground prose-headings:tracking-[-0.014em] prose-li:leading-7 prose-p:leading-7 [&_.template-placeholder]:hidden ${PROSE_HEADINGS} ${TRIM_EDGE_BLOCKS} ${PROSE_VARS}`;
