import type { schema } from "@repo/database";
import { describe, expect, it } from "vitest";
import {
	ALL_FIELDS_EDITABLE,
	getBoardFieldPermissions,
	getForbiddenPatchFields,
	intersectFieldPermissions,
	NO_FIELDS_EDITABLE,
} from "./field-permissions";

function permissions(overrides: {
	administrator?: boolean;
	tasks?: Partial<schema.TeamPermissions["tasks"]>;
}): schema.TeamPermissions {
	return {
		admin: {
			administrator: overrides.administrator ?? false,
			manageMembers: false,
			manageTeams: false,
			billing: false,
		},
		content: { manageCategories: false, manageLabels: false, manageViews: false, manageReleases: false },
		tasks: {
			create: false,
			editAny: false,
			deleteAny: false,
			assign: false,
			changeStatus: false,
			changePriority: false,
			...overrides.tasks,
		},
		moderation: { manageComments: false, approveSubmissions: false, manageVotes: false },
	};
}

const task = { createdBy: { id: "creator" }, assignees: [{ id: "assignee" }] };
const NONE = permissions({});

describe("getBoardFieldPermissions", () => {
	it("does not gate anything without a viewer or permissions", () => {
		expect(getBoardFieldPermissions(task, undefined, NONE)).toEqual(ALL_FIELDS_EDITABLE);
		expect(getBoardFieldPermissions(task, "someone", undefined)).toEqual(ALL_FIELDS_EDITABLE);
		expect(getBoardFieldPermissions(task, "someone", null)).toEqual(ALL_FIELDS_EDITABLE);
	});

	it("lets the creator and assignees edit everything, whatever their permissions", () => {
		expect(getBoardFieldPermissions(task, "creator", NONE)).toEqual(ALL_FIELDS_EDITABLE);
		expect(getBoardFieldPermissions(task, "assignee", NONE)).toEqual(ALL_FIELDS_EDITABLE);
	});

	it("lets an administrator edit everything", () => {
		expect(getBoardFieldPermissions(task, "admin", permissions({ administrator: true }))).toEqual(
			ALL_FIELDS_EDITABLE
		);
	});

	it("denies everything to someone with no task permissions", () => {
		expect(getBoardFieldPermissions(task, "someone", NONE)).toEqual(NO_FIELDS_EDITABLE);
	});

	it("maps each task permission to its fields", () => {
		expect(getBoardFieldPermissions(task, "someone", permissions({ tasks: { changeStatus: true } }))).toEqual({
			...NO_FIELDS_EDITABLE,
			status: true,
		});
		expect(getBoardFieldPermissions(task, "someone", permissions({ tasks: { changePriority: true } }))).toEqual({
			...NO_FIELDS_EDITABLE,
			priority: true,
		});
		expect(getBoardFieldPermissions(task, "someone", permissions({ tasks: { assign: true } }))).toEqual({
			...NO_FIELDS_EDITABLE,
			assignees: true,
		});
		expect(getBoardFieldPermissions(task, "someone", permissions({ tasks: { editAny: true } }))).toEqual({
			...NO_FIELDS_EDITABLE,
			labels: true,
			category: true,
			visibility: true,
			release: true,
			parent: true,
		});
	});

	it("handles a task with no creator or assignees", () => {
		expect(getBoardFieldPermissions({ createdBy: null, assignees: [] }, "someone", NONE)).toEqual(NO_FIELDS_EDITABLE);
	});
});

describe("intersectFieldPermissions", () => {
	it("is nothing for no tasks", () => {
		expect(intersectFieldPermissions([])).toEqual(NO_FIELDS_EDITABLE);
	});

	it("keeps only the fields every task allows", () => {
		expect(
			intersectFieldPermissions([
				{ ...NO_FIELDS_EDITABLE, status: true, priority: true },
				{ ...NO_FIELDS_EDITABLE, status: true },
				ALL_FIELDS_EDITABLE,
			])
		).toEqual({ ...NO_FIELDS_EDITABLE, status: true });
	});

	it("returns the shared full-access constant when every task allows everything", () => {
		expect(intersectFieldPermissions([ALL_FIELDS_EDITABLE, ALL_FIELDS_EDITABLE])).toBe(ALL_FIELDS_EDITABLE);
	});
});

describe("getForbiddenPatchFields", () => {
	it("allows a patch whose fields are all editable", () => {
		expect(getForbiddenPatchFields({ status: "done" }, { ...NO_FIELDS_EDITABLE, status: true })).toEqual([]);
		expect(getForbiddenPatchFields({ releaseId: "r1", priority: "high" }, ALL_FIELDS_EDITABLE)).toEqual([]);
	});

	it("names each guarded field the viewer can't edit, mapping column names to fields", () => {
		expect(
			getForbiddenPatchFields(
				{ releaseId: null, category: "c1", status: "todo" },
				{ ...NO_FIELDS_EDITABLE, status: true }
			)
		).toEqual(["release", "category"]);
		expect(getForbiddenPatchFields({ visible: "public", parentId: "p" }, NO_FIELDS_EDITABLE)).toEqual([
			"visibility",
			"parent",
		]);
	});

	it("ignores keys that aren't permission-gated", () => {
		expect(getForbiddenPatchFields({ somethingElse: 1 }, NO_FIELDS_EDITABLE)).toEqual([]);
	});
});
