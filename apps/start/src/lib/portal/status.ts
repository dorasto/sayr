import { type PortalDateInput, toDate } from "./time";

/** The task status enum as stored (note the single-"l" `canceled`). */
export type TaskStatus =
  | "backlog"
  | "todo"
  | "in-progress"
  | "done"
  | "canceled";

/** Visual variant of the public status chip. */
export type PortalStatusVariant =
  | "open"
  | "planned"
  | "progress"
  | "done"
  | "closed";

export interface PortalStatus {
  /** Public-facing label (statuses are relabelled for end users, not remapped). */
  label: string;
  variant: PortalStatusVariant;
  /** Position in the 4-step stepper, or `null` when the task is not on the path (canceled). */
  stepIndex: number | null;
}

/** The four public steps, in order. */
export const STEPPER_STEPS = [
  "Open",
  "Planned",
  "In Progress",
  "Done",
] as const;

const PORTAL_STATUS: Record<TaskStatus, PortalStatus> = {
  backlog: { label: "Open", variant: "open", stepIndex: 0 },
  todo: { label: "Planned", variant: "planned", stepIndex: 1 },
  "in-progress": { label: "In Progress", variant: "progress", stepIndex: 2 },
  done: { label: "Done", variant: "done", stepIndex: 3 },
  canceled: { label: "Won't do", variant: "closed", stepIndex: null },
};

/** Maps the internal status enum onto the public label/variant/stepper position. Unknown values read as "Open". */
export function getPortalStatus(status: string): PortalStatus {
  return PORTAL_STATUS[status as TaskStatus] ?? PORTAL_STATUS.backlog;
}

/** Stepper index (0-3) for a status, or `null` for `canceled` (no stepper is shown for Won't do). */
export function getStepperIndex(status: string): number | null {
  return getPortalStatus(status).stepIndex;
}

/** Statuses the end user can still act on: voting is closed on `canceled` only. */
export function isVotingClosed(status: string): boolean {
  return status === "canceled";
}

export interface ReleaseStatusLike {
  status: string;
}

/** A task counts as "shipped" once it is done AND its release has actually been released. */
export function isShipped(
  task: { status: string },
  release: ReleaseStatusLike | null | undefined,
): boolean {
  return task.status === "done" && release?.status === "released";
}

/** The date a release is shown under: `releasedAt ?? targetDate ?? createdAt`. */
export function getReleaseDate(release: {
  releasedAt?: PortalDateInput;
  targetDate?: PortalDateInput;
  createdAt?: PortalDateInput;
}): Date | null {
  return (
    toDate(release.releasedAt) ??
    toDate(release.targetDate) ??
    toDate(release.createdAt)
  );
}
