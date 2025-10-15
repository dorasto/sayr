/** biome-ignore-all lint/suspicious/noExplicitAny: <needed for now> */
type Job = {
	fn: () => Promise<any>;
	resolve: (result: any) => void;
	reject: (err: any) => void;
};

const queues = new Map<string, Job[]>();
const active = new Set<string>();

export async function enqueueJob(key: string, fn: () => Promise<any>) {
	return new Promise<any>((resolve, reject) => {
		const job: Job = { fn, resolve, reject };
		const q = queues.get(key) ?? [];
		queues.set(key, q);
		q.push(job);

		if (active.has(key)) return; // already processing
		processQueue(key);
	});
}

async function processQueue(key: string) {
	const q = queues.get(key);
	if (!q) return;
	active.add(key);

	let lastResult: any;
	try {
		while (q.length) {
			// biome-ignore lint/style/noNonNullAssertion: <needed>
			const job = q.shift()!;
			try {
				lastResult = await job.fn();
				// only resolve the *latest* job in queue
				if (q.length === 0) job.resolve(lastResult);
				else job.resolve(undefined); // obsolete request
			} catch (err) {
				console.error("Queue job failed:", err);
				job.reject(err);
			}
		}
	} finally {
		queues.delete(key);
		active.delete(key);
	}
}
