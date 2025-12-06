export type DeafultPayload = {
	name: string;
};

// 🔹 Union for GitHub group
export type DeafultJob = { type: "default"; payload: DeafultPayload };
