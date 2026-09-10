import type { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import {
  type DocCollection,
  type DocsCollection,
  defineCollections,
  defineDocs,
  frontmatterSchema,
} from "fumadocs-mdx/config";

export const docs: DocsCollection<typeof pageSchema, typeof metaSchema> =
  defineDocs({
    docs: {
      postprocess: {
        includeProcessedMarkdown: true,
      },
    },
    dir: "content/docs",
  });

// Feature pages (/features/$slug) — the MDX body only; title/description/hero
// copy/icon/related-features metadata lives in src/data/features.ts.
export const features: DocCollection<typeof frontmatterSchema> =
  defineCollections({
    type: "doc",
    dir: "content/features",
    schema: frontmatterSchema,
  });
