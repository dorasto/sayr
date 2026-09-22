import * as p from "@clack/prompts";
import pc from "picocolors";
import { listCategories, listLabels, listReleases } from "./lookups";
import { listOrganizationsCached } from "./orgs";

/** `SAYR_NO_INTERACTIVE` values that leave prompts ON: unset, empty, or any spelling of "false". Anything else turns them off. */
const PROMPTS_ALLOWED = new Set(["", "0", "false", "no", "off"]);

/** Guided mode is switched off by `--json` and by `SAYR_NO_INTERACTIVE`; this is the only option it reads. */
export interface InteractiveOptions {
	/** `--json`: stdout has to stay machine-readable, and clack draws its prompts on stdout. */
	json?: boolean;
}

/**
 * Whether a missing piece of input may be asked for instead of failing. Only ever true for a human at a
 * terminal: stdin AND stdout are TTYs (clack reads one and draws on the other), `--json` is off, and
 * `SAYR_NO_INTERACTIVE` is unset, empty or a spelling of "false" ("0", "no", "off"). Scripts, agents, CI and pipes
 * always get the plain behaviour.
 *
 * Call it lazily, at the point where a command would otherwise fail or do nothing — never for a command that
 * was already fully specified.
 */
export function canPrompt(opts: InteractiveOptions): boolean {
	if (opts.json) return false;
	const setting = process.env.SAYR_NO_INTERACTIVE?.trim().toLowerCase();
	if (setting !== undefined && !PROMPTS_ALLOWED.has(setting)) return false;
	return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/** Thrown when the user backs out of a prompt (Ctrl+C / Esc). `printError` reports it quietly as "Cancelled.". */
export class PromptCancelledError extends Error {
	constructor() {
		super("Cancelled.");
		this.name = "PromptCancelledError";
	}
}

/** clack resolves a cancelled prompt to a symbol; turn that into an exception every command already catches. */
function unwrap<T>(answer: T | symbol): T {
	if (p.isCancel(answer)) throw new PromptCancelledError();
	return answer;
}

export interface Choice {
	/** What the command sends — an id, a slug, or the plain flag value. */
	value: string;
	/** What the person sees. */
	label: string;
	hint?: string;
}

/** Choices whose label is the value itself (statuses, priorities, …). */
export function choicesFrom(values: readonly string[]): Choice[] {
	return values.map((value) => ({ value, label: value }));
}

interface AskTextOptions {
	message: string;
	initialValue?: string;
	placeholder?: string;
	/** Refuse an empty answer. Without it an empty answer is fine and comes back as "". */
	required?: boolean;
	/** Only called for a non-empty answer; return a message to ask again, or undefined to accept it. */
	validate?: (value: string) => string | undefined;
}

/** A free-text prompt. Returns the trimmed answer ("" if left empty and not `required`). */
export async function askText(opts: AskTextOptions): Promise<string> {
	const answer = await p.text({
		message: opts.message,
		initialValue: opts.initialValue,
		placeholder: opts.placeholder,
		validate: (value) => {
			// clack hands `undefined` over when nothing was typed, whatever its types say.
			const trimmed = typeof value === "string" ? value.trim() : "";
			if (trimmed.length === 0) return opts.required ? "This can't be empty." : undefined;
			return opts.validate?.(trimmed);
		},
	});
	const value = unwrap(answer);
	return typeof value === "string" ? value.trim() : "";
}

interface AskSelectOptions {
	message: string;
	choices: readonly Choice[];
	initialValue?: string;
}

export async function askSelect(opts: AskSelectOptions): Promise<string> {
	return unwrap(
		await p.select<string>({
			message: opts.message,
			options: opts.choices.map((choice) => ({ value: choice.value, label: choice.label, hint: choice.hint })),
			initialValue: opts.initialValue,
		})
	);
}

interface AskMultiSelectOptions {
	message: string;
	choices: readonly Choice[];
	/** Values ticked when the prompt opens. */
	initialValues?: readonly string[];
	/** Refuse an empty selection. Off by default — "tick nothing" is how most of these prompts are skipped. */
	required?: boolean;
}

export async function askMultiSelect(opts: AskMultiSelectOptions): Promise<string[]> {
	return unwrap(
		await p.multiselect<string>({
			message: `${opts.message} ${pc.dim("(space to select, enter to confirm)")}`,
			options: opts.choices.map((choice) => ({ value: choice.value, label: choice.label, hint: choice.hint })),
			initialValues: opts.initialValues ? [...opts.initialValues] : undefined,
			required: opts.required ?? false,
		})
	);
}

/* -------------------------------------------------------------------------- */
/*                            Equivalent-command tip                          */
/* -------------------------------------------------------------------------- */

/** `sayr-local` is `sayr` with `SAYR_PROFILE=local` — a tip must point at the profile the run actually used. */
function cliBin(): string {
	return process.env.SAYR_PROFILE?.trim() === "local" ? "sayr-local" : "sayr";
}

/** Quotes a value for the shell only when it needs it, so `--status done` stays `--status done`. */
function shellQuote(value: string): string {
	if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
	if (process.platform === "win32") return `"${value.replaceAll('"', '\\"')}"`;
	return `'${value.replaceAll("'", "'\\''")}'`;
}

/** `[flag, value]`: a string is the flag's value, `true` a bare switch (`--no-release`), `undefined`/`false` omits it. */
export type TipFlag = readonly [flag: string, value: string | boolean | undefined];

/** The non-interactive command that does what a guided run just did, e.g. `sayr task update 79 --status done`. */
function equivalentCommand(command: readonly string[], flags: readonly TipFlag[]): string {
	const parts = [cliBin(), ...command.map(shellQuote)];
	for (const [flag, value] of flags) {
		if (value === undefined || value === false) continue;
		parts.push(flag);
		if (value !== true) parts.push(shellQuote(value));
	}
	return parts.join(" ");
}

/** Printed (dim) after a guided run succeeds, so the next one can skip the prompts. */
export function printTip(command: readonly string[], flags: readonly TipFlag[]): void {
	console.log(pc.dim(`Tip: ${equivalentCommand(command, flags)}`));
}

/* -------------------------------------------------------------------------- */
/*                               API-backed pickers                           */
/* -------------------------------------------------------------------------- */

/**
 * "Which organization?" for a command with no `--org` and no default. Returns the slug, or undefined when the
 * account belongs to none (the caller then fails exactly as it always did). One organization needs no question.
 */
export async function pickOrganization(): Promise<string | undefined> {
	const organizations = await listOrganizationsCached();
	const only = organizations[0];
	if (!only) return undefined;

	const setDefaultTip = (slug: string): string =>
		pc.dim(
			`Tip: ${equivalentCommand(["config", "set-org", slug], [])} makes it your default, so this isn't asked again.`
		);
	if (organizations.length === 1) {
		console.log(pc.dim(`Using organization ${only.name} (${only.slug}) — the only one you belong to.`));
		console.log(setDefaultTip(only.slug));
		return only.slug;
	}

	const slug = await askSelect({
		message: "Which organization?",
		choices: organizations.map((org) => ({ value: org.slug, label: org.name, hint: `${org.shortId} · ${org.slug}` })),
	});
	console.log(setDefaultTip(slug));
	return slug;
}

interface PickOptions {
	message?: string;
	/** The value to start on. */
	initialValue?: string;
}

/** Picks one of the organization's categories and returns its id — or undefined when there are none to pick. */
export async function pickCategory(orgId: string, opts: PickOptions = {}): Promise<string | undefined> {
	const categories = await listCategories(orgId);
	if (categories.length === 0) {
		console.log(pc.dim("No categories in this organization."));
		return undefined;
	}
	return askSelect({
		message: opts.message ?? "Category",
		choices: categories.map((category) => ({ value: category.id, label: category.name })),
		initialValue: opts.initialValue,
	});
}

/** The "No release" option's value. Never a real slug or id, both of which are non-empty. */
const NO_RELEASE = "";

interface PickReleaseOptions extends PickOptions {
	/** Offer a "No release" choice — taking a task out of its release. */
	allowNone?: boolean;
}

/**
 * Picks one of the organization's releases and returns its slug (what `--release` takes). `false` means the
 * "No release" choice (the same thing `--no-release` says); undefined means there was nothing to pick from.
 */
export async function pickRelease(orgId: string, opts: PickReleaseOptions = {}): Promise<string | false | undefined> {
	const releases = await listReleases(orgId);
	if (releases.length === 0) {
		console.log(pc.dim("No releases in this organization."));
		return undefined;
	}
	const choices: Choice[] = releases.map((release) => ({
		value: release.slug,
		label: release.name,
		hint: `${release.slug} · ${release.status}`,
	}));
	if (opts.allowNone) choices.unshift({ value: NO_RELEASE, label: "No release", hint: "remove it from its release" });

	const slug = await askSelect({
		message: opts.message ?? "Release",
		choices,
		initialValue: opts.initialValue,
	});
	return slug === NO_RELEASE ? false : slug;
}

interface PickLabelsOptions {
	message?: string;
	/** Label ids ticked when the prompt opens. */
	initialValues?: readonly string[];
}

/** Picks any number of the organization's labels and returns their ids — undefined when there are none to pick. */
export async function pickLabels(orgId: string, opts: PickLabelsOptions = {}): Promise<string[] | undefined> {
	const labels = await listLabels(orgId);
	if (labels.length === 0) {
		console.log(pc.dim("No labels in this organization."));
		return undefined;
	}
	return askMultiSelect({
		message: opts.message ?? "Labels",
		choices: labels.map((label) => ({
			value: label.id,
			label: label.name,
			hint: label.visible === "private" ? "private" : undefined,
		})),
		initialValues: opts.initialValues,
	});
}
