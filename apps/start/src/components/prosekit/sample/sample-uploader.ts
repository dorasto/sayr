import type { Uploader } from "prosekit/extensions/file";

/**
 * "Uploads" the file locally by converting it to a Blob URL.
 * No network request is made.
 */
export const sampleUploader: Uploader<string> = async ({ file, onProgress }): Promise<string> => {
	return new Promise((resolve) => {
		// Simulate progress
		const total = file.size;
		let loaded = 0;

		const chunkSize = Math.max(1024 * 64, Math.floor(total / 20)); // simulate 20 steps
		const simulate = () => {
			loaded = Math.min(loaded + chunkSize, total);
			onProgress({ loaded, total });

			if (loaded < total) {
				setTimeout(simulate, 30);
			} else {
				// Create and return the Blob URL
				const url = URL.createObjectURL(file);
				resolve(url);
			}
		};

		simulate();
	});
};
