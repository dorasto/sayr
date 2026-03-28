import { getIntegrationConfigByValue, getIntegrationEnabled, getIntegrationStorage } from "@repo/database";
import {
	SlashCommandSubcommandBuilder,
	ChatInputCommandInteraction,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	Client,
	Events,
	MessageFlags,
	type StringSelectMenuInteraction,
} from "discord.js";
import type { DiscordTemplate } from "../../api/index";
import Sayr from "@sayrio/public";
Sayr.client.setToken(process.env.SAYR_API_KEY);
Sayr.client.setBaseUrl("http://api.app.localhost:5468");

export const data = (sub: SlashCommandSubcommandBuilder) =>
	sub.setName("create").setDescription("Create a new Sayr task");

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getOrgAndTemplates(guildId: string | null) {
	if (!guildId) return null;

	const connected = await getIntegrationConfigByValue("guildId", "discordbot", guildId);
	if (!connected) return null;

	const enabled = await getIntegrationEnabled(connected.organizationId, "discordbot");
	if (!enabled) return null;

	const storage = await getIntegrationStorage(connected.organizationId, "discordbot");
	const storageData = (storage?.data ?? {}) as Record<string, unknown>;
	const templates = (storageData.templates ?? []) as DiscordTemplate[];

	return { connected, templates };
}

function buildModal(template: DiscordTemplate) {
	const modal = new ModalBuilder()
		.setCustomId(`task-create-modal:${template.id}`)
		.setTitle(template.name);

	// Title is always first
	const titleInput = new TextInputBuilder()
		.setCustomId("title")
		.setLabel(template.titlePrefix ? `Title (prefix: ${template.titlePrefix})` : "Title")
		.setStyle(TextInputStyle.Short)
		.setRequired(true);

	if (template.titlePrefix) {
		titleInput.setPlaceholder(`${template.titlePrefix} `);
	}

	modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput));

	// Add enabled questions (non-empty label), up to 4 (Discord modal max is 5 total)
	const questionSlots = [
		{ id: "question_1", label: template.questions.question_1 },
		{ id: "question_2", label: template.questions.question_2 },
		{ id: "question_3", label: template.questions.question_3 },
		{ id: "question_4", label: template.questions.question_4 },
	].filter((q) => q.label.trim() !== "");

	for (const q of questionSlots) {
		const input = new TextInputBuilder()
			.setCustomId(q.id)
			.setLabel(q.label)
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(false);

		modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
	}

	return modal;
}

// ─── Command Execute ──────────────────────────────────────────────────────────

export async function execute(interaction: ChatInputCommandInteraction) {
	const result = await getOrgAndTemplates(interaction.guildId);

	if (!result) {
		await interaction.reply({
			content: "This integration is not enabled.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const { templates } = result;

	if (templates.length === 0) {
		await interaction.reply({
			content: "No templates are configured. Ask an admin to create templates in the Sayr integration settings.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// Single template — skip the select menu and go straight to modal
	if (templates.length === 1) {
		await interaction.showModal(buildModal(templates[0]!));
		return;
	}

	// Multiple templates — show a select menu first
	const select = new StringSelectMenuBuilder()
		.setCustomId("sayr-template-select")
		.setPlaceholder("Choose a template...")
		.addOptions(
			templates.map((t) =>
				new StringSelectMenuOptionBuilder()
					.setLabel(t.name)
					.setValue(t.id)
					.setDescription(
						t.description
							? t.description.slice(0, 100)
							: `Status: ${t.defaults.status} | Priority: ${t.defaults.priority}`,
					),
			),
		);

	const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

	await interaction.reply({
		content: "Select a template to use:",
		components: [row],
		flags: MessageFlags.Ephemeral,
	});
}

// ─── Interaction Handlers ─────────────────────────────────────────────────────

export function registerModalHandler(client: Client) {
	// Handle template select menu
	client.on(Events.InteractionCreate, async (interaction) => {
		if (!interaction.isStringSelectMenu()) return;
		if (interaction.customId !== "sayr-template-select") return;

		const menuInteraction = interaction as StringSelectMenuInteraction;
		const templateId = menuInteraction.values[0];
		if (!templateId) return;

		const result = await getOrgAndTemplates(menuInteraction.guildId);
		if (!result) {
			await menuInteraction.reply({
				content: "This integration is not enabled.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const template = result.templates.find((t) => t.id === templateId);
		if (!template) {
			await menuInteraction.reply({
				content: "Template not found. It may have been deleted.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await menuInteraction.showModal(buildModal(template));
	});

	// Handle modal submit
	client.on(Events.InteractionCreate, async (interaction) => {
		if (!interaction.isModalSubmit()) return;
		if (!interaction.customId.startsWith("task-create-modal:")) return;

		const templateId = interaction.customId.slice("task-create-modal:".length);

		const result = await getOrgAndTemplates(interaction.guildId);
		if (!result) {
			await interaction.reply({
				content: "This integration is not enabled.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const { connected, templates } = result;
		const template = templates.find((t) => t.id === templateId);

		if (!template) {
			await interaction.reply({
				content: "Template not found. It may have been deleted. Please run /sayr create again.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// Collect field values
		const modalFields = interaction.fields;
		const titleRaw = modalFields.getTextInputValue("title") || "Untitled Task";
		const title =
			template.titlePrefix && !titleRaw.startsWith(template.titlePrefix)
				? `${template.titlePrefix} ${titleRaw}`
				: titleRaw;

		// Build markdown description from answered questions
		const questionSlots = [
			{ id: "question_1", label: template.questions.question_1 },
			{ id: "question_2", label: template.questions.question_2 },
			{ id: "question_3", label: template.questions.question_3 },
			{ id: "question_4", label: template.questions.question_4 },
		].filter((q) => q.label.trim() !== "");

		let description = "";
		for (const q of questionSlots) {
			let answer = "";
			try {
				answer = modalFields.getTextInputValue(q.id);
			} catch {
				// Field wasn't in the modal — skip
			}
			if (answer) {
				description += `### ${q.label}\n${answer}\n\n`;
			}
		}

		const categoryId = template.defaults.categoryId;

		const res = await Sayr.me.createTask({
			title,
			description,
			status: template.defaults.status as "backlog" | "todo" | "in-progress" | "done" | "canceled",
			priority: template.defaults.priority as "none" | "low" | "medium" | "high" | "urgent",
			category: categoryId === "" || categoryId === "_none_" ? undefined : categoryId,
			orgId: connected.organizationId,
			integration: {
				id: connected.integrationId,
				name: "discordbot",
				platform: "first-party",
			},
		});

		if (res.success !== true) {
			await interaction.reply({
				content: "Failed to create the task. Please try again.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (res.data) {
			await interaction.reply({
				content:
					`Your task has been created!\n\n` +
					`Title: **${res.data.title}**\n` +
					`Template: ${template.name}\n` +
					`View it here: ${res.data.publicPortalUrl}`,
				flags: MessageFlags.Ephemeral,
			});
		}
	});
}

