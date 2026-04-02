import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(__dirname, "template"); // ← ONLY ONE TEMPLATE FOLDER
const INTEGRATIONS_DIR = join(__dirname, "../../../integrations/services");

interface Options {
	name: string;
	author: string;
	description: string;
}

interface TemplateFile {
	path: string;
	content: string;
}

function replacePlaceholders(content: string, options: Options): string {
	const id = options.name.toLowerCase().replace(/\s+/g, "-");
	const idUpperCase = id.toUpperCase();
	return content
		.replace(/\{\{id\}\}/g, id)
		.replace(/\{\{name\}\}/g, options.name)
		.replace(/\{\{author\}\}/g, options.author)
		.replace(/\{\{description\}\}/g, options.description)
		.replace(/\{\{idUpperCase\}\}/g, idUpperCase);
}

async function getTemplateFiles(): Promise<TemplateFile[]> {
	if (!existsSync(TEMPLATE_DIR)) {
		throw new Error(`Template folder missing: ${TEMPLATE_DIR}`);
	}

	const files: TemplateFile[] = [];

	async function scan(dir: string, base = "") {
		const entries = readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const relPath = join(base, entry.name).replace(/\\/g, "/");
			const fullPath = join(dir, entry.name);

			if (entry.isDirectory()) {
				await scan(fullPath, relPath);
			} else {
				const content = await readFile(fullPath, "utf-8");
				files.push({ path: relPath, content });
			}
		}
	}

	await scan(TEMPLATE_DIR);
	return files;
}

async function scaffold(options: Options): Promise<void> {
	const id = options.name.toLowerCase().replace(/\s+/g, "-");
	const targetDir = join(INTEGRATIONS_DIR, id);

	if (existsSync(targetDir)) {
		console.error(`Integration "${id}" already exists at ${targetDir}`);
		process.exit(1);
	}

	console.log(`Creating integration "${options.name}"...`);
	console.log(`Target directory: ${targetDir}`);

	const templateFiles = await getTemplateFiles();

	for (const file of templateFiles) {
		const targetPath = join(targetDir, file.path);
		const parentDir = file.path.includes("/")
			? join(targetDir, file.path.replace(/\/[^/]+$/, ""))
			: targetDir;

		await mkdir(parentDir, { recursive: true });

		const content = replacePlaceholders(file.content, options);
		await writeFile(targetPath, content);

		console.log(`  Created: ${file.path}`);
	}

	console.log(`\n✓ Integration "${options.name}" created successfully!`);
	console.log(`\nNext steps:`);
	console.log(`  1. pnpm install in root to update dependencies`);
	console.log(`  2. Enable the integration: export INTEGRATION_${id.toUpperCase()}_ENABLED=true`);
	console.log(`  3. Restart the integrations app`);
	console.log(`  4. Configure at /admin/integrations/${id}`);
}

function parseArgs(): Options {
	const args = process.argv.slice(2);

	let name = "";
	let author = "Your Name";
	let description = "Integration Description";

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]!;
		if (arg === "--author" || arg === "-a") {
			author = args[++i] ?? "Your Name";
		} else if (!arg.startsWith("-")) {
			name = arg;
		} else if (arg === "--description" || arg === "-d") {
			description = args[++i] ?? "Integration Description";
		}
	}

	if (!name) {
		console.log("Usage: pnpm create-integration <name> [--author <name>] [--description <desc>]");
		process.exit(1);
	}

	return { name, author, description };
}

const options = parseArgs();
scaffold(options);