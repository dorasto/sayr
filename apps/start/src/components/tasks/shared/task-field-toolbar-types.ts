import type { schema } from "@repo/database";
import type { OrgTaskSearchResult } from "@/lib/fetches/searchTasks";
import type { TaskDetailOrganization } from "../types";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

/** Per-field editability flags. `true` = user can edit, `false` = read-only. */
export type FieldPermissions = Partial<Record<FieldKey, boolean>>;

export type FieldKey =
	| "identifier"
	| "status"
	| "priority"
	| "labels"
	| "assignees"
	| "category"
	| "visibility"
	| "release"
	| "vote"
	| "githubIssue"
	| "githubPr"
	| "parent";

/** Per-field presentation overrides. */
export interface FieldConfig {
	key: FieldKey;
	/** Show only the icon, hide the text label. Overrides `compact` and `showLabel`. */
	iconOnly?: boolean;
	/** Compact display mode (behavior varies per field). */
	compact?: boolean;
	/** Show a text label beside the trigger. */
	showLabel?: boolean;
	/** Show a chevron/caret on the dropdown trigger. */
	showChevron?: boolean;
	/** Extra className merged onto the field trigger. */
	className?: string;
	/**
	 * When true (creator variant only), hide this field behind the "..." overflow
	 * menu unless it currently has a value set. Fields with values are promoted
	 * back to the inline toolbar automatically.
	 */
	overflow?: boolean;
}

/** A field entry is either a plain key (uses variant defaults) or an object with overrides. */
export type FieldEntry = FieldKey | FieldConfig;

export interface TaskFieldToolbarProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	/** Per-field editability overrides based on the current user's permissions. */
	fieldPermissions?: FieldPermissions;

	/**
	 * Ordered array of fields to render.
	 * - Each entry is a `FieldKey` string (variant defaults) or a `FieldConfig`
	 *   object with per-field presentation overrides.
	 * - Presence in the array = visible; absence = hidden.
	 * - Array order = render order.
	 * - When omitted, defaults to `DEFAULT_FIELDS`.
	 */
	fields?: FieldEntry[];

	// Data for pickers
	availableLabels?: schema.labelType[];
	availableUsers?: schema.userType[];
	categories?: schema.categoryType[];
	releases?: schema.releaseType[];

	/** Organization used by the `identifier` field for slug display & clipboard URL */
	organization?: TaskDetailOrganization;

	// --- Parent task field (creator mode) ---
	/** Organization ID for server-side task search in the parent picker */
	organizationId?: string;
	/** Currently selected parent task (for display in the creator trigger) */
	selectedParentTask?: OrgTaskSearchResult | null;
	/** Called with the full task object when parent selection changes (supplements onChange.parent) */
	onParentTaskChange?: (task: OrgTaskSearchResult | null) => void;

	// --- Creator mode: simple onChange callbacks ---
	onChange?: {
		status?: (value: string | undefined) => void;
		priority?: (value: string | undefined) => void;
		labels?: (ids: string[]) => void;
		assignees?: (ids: string[]) => void;
		category?: (id: string) => void;
		visibility?: (value: "public" | "private") => void;
		release?: (id: string) => void;
		parent?: (id: string | null) => void;
	};

	// --- Label creation ---
	/** If true, shows an inline "Create label" form when no labels match search */
	canCreateLabel?: boolean;
	/** Called with the full updated labels list after a new label is created */
	onLabelCreated?: (newLabels: schema.labelType[]) => void;

	// --- Detail mode: state for internal optimistic updates ---
	tasks?: schema.TaskWithLabels[];
	setTasks?: (tasks: schema.TaskWithLabels[]) => void;
	setSelectedTask?: (task: schema.TaskWithLabels | null) => void;

	// --- Presentation ---
	/** @default "creator" */
	variant?: "creator" | "compact" | "sidebar";
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/** Default field order when no `fields` prop is provided. */
export const DEFAULT_FIELDS: FieldEntry[] = [
	"status",
	"priority",
	"labels",
	"assignees",
	"category",
	"visibility",
	"release",
];

/** Normalize a FieldEntry into a resolved config. */
export function resolveFieldEntry(entry: FieldEntry): FieldConfig {
	if (typeof entry === "string") return { key: entry };
	return entry;
}

export const VARIANT_STYLES = {
	creator: {
		container: "flex items-center flex-wrap gap-1 w-full",
		showLabel: false,
		showChevron: false,
		compact: false,
		className: "",
		useCustomTrigger: true,
	},
	compact: {
		container: "flex items-center flex-wrap gap-1 w-full",
		showLabel: false,
		showChevron: false,
		compact: true,
		className:
			"bg-accent p-1 h-auto w-fit shrink-0 border-transparent hover:bg-secondary",
		useCustomTrigger: false,
	},
	sidebar: {
		container: "flex flex-col gap-2",
		showLabel: false,
		showChevron: false,
		compact: false,
		className: "bg-transparent p-1 h-auto w-fit",
		useCustomTrigger: false,
	},
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Permission helper
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compute per-field editability based on the user's relationship to the task
 * and their org-level permissions. Creators and assignees bypass all granular
 * checks — they can always edit their own tasks.
 */
export function getTaskFieldPermissions(
	task: schema.TaskWithLabels,
	userId: string | undefined,
	permissions: schema.TeamPermissions | null | undefined,
): FieldPermissions {
	if (!userId || !permissions) return {};

	// Creators and assignees can edit everything
	const isCreator = task.createdBy?.id === userId;
	const isAssignee = task.assignees?.some((a) => a.id === userId) ?? false;
	if (isCreator || isAssignee) {
		return {
			status: true,
			priority: true,
			labels: true,
			assignees: true,
			category: true,
			visibility: true,
			release: true,
			identifier: true,
			vote: true,
			githubIssue: true,
			githubPr: true,
			parent: true,
		};
	}

	// Administrator bypasses all checks
	if (permissions.admin?.administrator) {
		return {
			status: true,
			priority: true,
			labels: true,
			assignees: true,
			category: true,
			visibility: true,
			release: true,
			identifier: true,
			vote: true,
			githubIssue: true,
			githubPr: true,
			parent: true,
		};
	}

	// Map field keys to their corresponding permission flags
	const editAny = permissions.tasks?.editAny ?? false;
	return {
		status: permissions.tasks?.changeStatus ?? false,
		priority: permissions.tasks?.changePriority ?? false,
		assignees: permissions.tasks?.assign ?? false,
		labels: editAny,
		category: editAny,
		visibility: editAny,
		release: editAny,
		// These are always accessible (read-only display or not permission-gated)
		identifier: true,
		vote: true,
		githubIssue: true,
		githubPr: true,
		parent: editAny,
	};
}
