/**
 * Astro integration that auto-generates a docs page per integration service.
 *
 * On every `astro dev` start and every `astro build` it:
 *  1. Scans integrations/services/ for subdirectories
 *  2. Reads each integration's docs.ts (markdown string) and integration.ts (metadata)
 *  3. Writes apps/marketing/src/content/docs/docs/integrations/<id>.md
 *  4. Cleans up any previously generated files whose integration no longer exists
 *
 * Files are parsed as raw text — no TypeScript execution required.
 */
import type { AstroIntegration } from "astro";
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { resolve, join } from "node:path";

const GENERATED_MARKER = "<!-- AUTO-GENERATED from integrations/services/";

// ---------------------------------------------------------------------------
// Raw-text parsers
// ---------------------------------------------------------------------------

function extractDocs(raw: string): string | null {
  // Matches: export const docs = `...`;
  const match = raw.match(/export\s+const\s+docs\s*=\s*`([\s\S]*?)`;/);
  if (!match || !match[1]?.trim()) return null;
  return match[1].trim();
}

function extractField(raw: string, field: string): string | null {
  const re = new RegExp(`${field}:\\s*["'\`]([^"'\`\\n]+)["'\`]`);
  const match = raw.match(re);
  return match?.[1]?.trim() ?? null;
}

function extractAuthorName(raw: string): string | null {
  // Match author: { name: "..." }  (may span lines)
  const block = raw.match(/author:\s*\{([\s\S]*?)\}/);
  if (!block) return null;
  return extractField(block[1]!, "name");
}

function extractAuthorUrl(raw: string): string | null {
  const block = raw.match(/author:\s*\{([\s\S]*?)\}/);
  if (!block) return null;
  return extractField(block[1]!, "url");
}

// ---------------------------------------------------------------------------
// Core generator
// ---------------------------------------------------------------------------

export interface IntegrationDocsMeta {
  id: string;
  name: string;
  description: string;
  version: string;
  authorName: string | null;
  authorUrl: string | null;
  docs: string;
}

export interface GenerateLogger {
  info(msg: string): void;
  warn(msg: string): void;
}

export async function generateIntegrationDocs(
  marketingRoot: string,
  logger: GenerateLogger,
): Promise<void> {
  // Resolve monorepo root (apps/marketing → ../..)
  const monorepoRoot = resolve(marketingRoot, "../..");
  const servicesDir = join(monorepoRoot, "integrations", "services");
  const outputDir = join(
    marketingRoot,
    "src",
    "content",
    "docs",
    "docs",
    "integrations",
  );

  if (!existsSync(servicesDir)) {
    logger.warn(
      `[generate-integration-docs] Services directory not found: ${servicesDir}`,
    );
    return;
  }

  // Find all integration subdirectories
  const entries = readdirSync(servicesDir, { withFileTypes: true });
  const integrationFolders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  logger.info(
    `[generate-integration-docs] Found ${integrationFolders.length} integration(s): ${integrationFolders.join(", ")}`,
  );

  const generatedIds = new Set<string>();

  for (const id of integrationFolders) {
    const serviceDir = join(servicesDir, id);
    const docsPath = join(serviceDir, "docs.ts");
    const integrationPath = join(serviceDir, "integration.ts");

    // docs.ts is required
    if (!existsSync(docsPath)) {
      logger.warn(
        `[generate-integration-docs] Skipping '${id}' — no docs.ts found`,
      );
      continue;
    }

    const docsRaw = readFileSync(docsPath, "utf-8");
    const docsContent = extractDocs(docsRaw);

    if (!docsContent) {
      logger.warn(
        `[generate-integration-docs] Skipping '${id}' — docs.ts has no content`,
      );
      continue;
    }

    // Extract metadata from integration.ts if it exists
    let name = id;
    let description = "";
    let version = "1.0.0";
    let authorName: string | null = null;
    let authorUrl: string | null = null;

    if (existsSync(integrationPath)) {
      const integrationRaw = readFileSync(integrationPath, "utf-8");
      name = extractField(integrationRaw, "name") ?? id;
      description = extractField(integrationRaw, "description") ?? "";
      version = extractField(integrationRaw, "version") ?? "1.0.0";
      authorName = extractAuthorName(integrationRaw);
      authorUrl = extractAuthorUrl(integrationRaw);
    }

    // Build the .md file content
    const outputPath = join(outputDir, `${id}.md`);
    const authorLine = authorName
      ? `\n> Maintained by ${authorUrl ? `[${authorName}](${authorUrl})` : authorName} · v${version}\n`
      : `\n> v${version}\n`;

    const mdContent = [
      `---`,
      `title: ${name}`,
      ...(description ? [`description: ${description}`] : []),
      `sidebar:`,
      `   order: 10`,
      `   label: ${name}`,
      `---`,
      ``,
      `${GENERATED_MARKER}${id}/docs.ts — do not edit directly -->`,
      ``,
      authorLine,
      `---`,
      docsContent,
    ].join("\n");

    writeFileSync(outputPath, mdContent, "utf-8");
    generatedIds.add(id);
    logger.info(`[generate-integration-docs] Written: integrations/${id}.md`);
  }

  // Clean up stale generated files
  if (existsSync(outputDir)) {
    const existing = readdirSync(outputDir).filter((f) => f.endsWith(".md"));
    for (const file of existing) {
      const filePath = join(outputDir, file);
      const content = readFileSync(filePath, "utf-8");

      if (!content.includes(GENERATED_MARKER)) {
        // Hand-authored — leave it alone
        continue;
      }

      const id = file.replace(/\.md$/, "");
      if (!generatedIds.has(id)) {
        unlinkSync(filePath);
        logger.info(
          `[generate-integration-docs] Removed stale: integrations/${file}`,
        );
      }
    }
  }

  logger.info(
    `[generate-integration-docs] Done. Generated ${generatedIds.size} file(s).`,
  );
}

// ---------------------------------------------------------------------------
// Astro integration export
// ---------------------------------------------------------------------------

export function generateIntegrationDocsIntegration(): AstroIntegration {
  return {
    name: "generate-integration-docs",
    hooks: {
      "astro:server:setup": async ({ logger }) => {
        await generateIntegrationDocs(process.cwd(), logger);
      },
      "astro:build:start": async ({ logger }) => {
        await generateIntegrationDocs(process.cwd(), logger);
      },
    },
  };
}
