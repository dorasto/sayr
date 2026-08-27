import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs, type DocsCollection } from "fumadocs-mdx/config";

export const docs: DocsCollection<typeof pageSchema, typeof metaSchema> = defineDocs({
	dir: "content/docs",
});
