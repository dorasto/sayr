import type { schema } from "@repo/database";
import { describe, expect, it } from "vitest";
import {
	createTaskCreatedMessage,
	isTaskRecord,
	readTaskCreatedMessage,
	TASK_CREATED_MESSAGE_TYPE,
} from "./task-created-message";

function makeTask(id: string): schema.TaskWithLabels {
	return {
		id,
		organizationId: "org-a",
		shortId: 1,
		visible: "public",
		createdAt: new Date(0),
		updatedAt: new Date(0),
		title: id,
		description: { type: "doc" },
		status: "todo",
		priority: "none",
		category: null,
		releaseId: null,
		voteCount: 0,
		parentId: null,
		aiSummaryHash: null,
		aiSummaryGeneratedAt: null,
		embedding: null,
		labels: [],
		assignees: [],
	};
}

describe("task-created message", () => {
	it("round-trips a task through create → read", () => {
		const task = makeTask("t1");
		const message = createTaskCreatedMessage(task);

		expect(message).toEqual({ type: TASK_CREATED_MESSAGE_TYPE, payload: task });
		expect(readTaskCreatedMessage(message)).toBe(task);
	});

	it("survives the structured clone postMessage applies", () => {
		const message = createTaskCreatedMessage(makeTask("t1"));

		expect(readTaskCreatedMessage(structuredClone(message))?.id).toBe("t1");
	});

	it("reads nothing from anything that isn't a well-formed task-created message", () => {
		const ignored: unknown[] = [
			undefined,
			null,
			"task-created",
			7,
			{},
			{ type: "task-created" },
			{ type: "task-created", payload: null },
			{ type: "task-created", payload: { id: "t1" } },
			{ type: "SSE_RECONNECTED" },
			{ type: "timeline-update", payload: "t1" },
			{ payload: makeTask("t1") },
		];

		for (const message of ignored) {
			expect(readTaskCreatedMessage(message)).toBeNull();
		}
	});
});

describe("isTaskRecord", () => {
	it("accepts a full record and rejects partial payloads the broadcasters also send", () => {
		expect(isTaskRecord(makeTask("t1"))).toBe(true);

		expect(isTaskRecord({ releaseId: null })).toBe(false);
		expect(isTaskRecord({ taskIds: ["t1"], status: "done" })).toBe(false);
		expect(isTaskRecord({ id: "t1", voteCount: 2 })).toBe(false);
		expect(isTaskRecord({ ...makeTask("t1"), labels: undefined })).toBe(false);
		expect(isTaskRecord({ ...makeTask("t1"), assignees: null })).toBe(false);
		expect(isTaskRecord({ ...makeTask("t1"), id: 1 })).toBe(false);
		expect(isTaskRecord(null)).toBe(false);
		expect(isTaskRecord([])).toBe(false);
	});
});
