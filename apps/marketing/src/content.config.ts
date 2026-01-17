import { defineCollection, z } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

const authorSchema = z.object({
	name: z.string(),
	github: z.string().optional(),
	avatar: z.string().optional(),
});

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				// Primary author of the page
				author: authorSchema.optional(),
				// Additional contributors
				contributors: z.array(authorSchema).optional(),
			}),
		}),
	}),
};
