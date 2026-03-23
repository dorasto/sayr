import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

const authorSchema = z.object({
	name: z.string(),
	github: z.string().optional(),
	avatar: z.string().optional(),
});

const features = defineCollection({
	loader: glob({ pattern: "**/*.mdx", base: "./src/content/features" }),
	// Metadata (title, description, hero copy, icon, related, etc.) lives in
	// src/data/features.ts — the MDX frontmatter only holds the page title used
	// as a fallback for Astro's content collection ID.
	schema: z.object({
		title: z.string(),
	}),
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
	features,
};
