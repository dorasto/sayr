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

// Marketing SEO pages (/compare, /alternatives, /solutions, /integrations,
// /guides) — the MDX body only, at content/pages/<section>/<slug>.mdx. Title,
// description, heading, last-updated date and related pages live in
// src/data/marketing-pages.ts, same split as the feature pages above.
export const pages: DocCollection<typeof frontmatterSchema> =
  defineCollections({
    type: "doc",
    dir: "content/pages",
    schema: frontmatterSchema,
  });
