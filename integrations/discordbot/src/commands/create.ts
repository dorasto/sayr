import { getIntegrationConfigByValue, getIntegrationEnabled, getIntegrationStorage, getOrganizationPublicById } from "@repo/database";
import {
    SlashCommandSubcommandBuilder,
    ChatInputCommandInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    Client,
    Events,
    MessageFlags
} from "discord.js";
import Sayr from "@sayrio/public";
Sayr.client.setToken(process.env.SAYR_API_KEY)
Sayr.client.setBaseUrl("http://api.app.localhost:5468")
const DEFAULT_QUESTIONS = {
    question_1: "",
    question_2: "",
    question_3: "",
    question_4: ""
};

export const data = (sub: SlashCommandSubcommandBuilder) => sub.setName("create").setDescription("Create a new Sayr task");

function buildModal(questions: any) {
    const modal = new ModalBuilder()
        .setCustomId("task-create-modal")
        .setTitle("Create New Task");

    for (const q of questions) {
        const input = new TextInputBuilder()
            .setCustomId(q.id)
            .setLabel(q.label)
            .setStyle(q.style)
            .setRequired(q.required || false);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
        modal.addComponents(row);
    }

    return modal;
}

export async function execute(interaction: ChatInputCommandInteraction) {
    const connected = await getIntegrationConfigByValue(
        "guildId",
        "discordbot",
        interaction.guildId
    );

    if (!connected) {
        await interaction.reply({
            content: "This integration is not enabled.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const enabled = await getIntegrationEnabled(
        connected.organizationId,
        "discordbot"
    );

    if (!enabled) {
        await interaction.reply({
            content: "This integration is not enabled.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const storage = await getIntegrationStorage(connected.organizationId, "discordbot");
    const data = (storage?.data ?? {}) as Record<string, unknown>;
    const storedQuestions = (data.questions ?? DEFAULT_QUESTIONS) as Record<string, string>;

    const questions = [
        { id: "title", label: "Title", style: TextInputStyle.Short, required: true },
        { id: "question_1", label: storedQuestions.question_1 || "Question 1", style: TextInputStyle.Paragraph },
        { id: "question_2", label: storedQuestions.question_2 || "Question 2", style: TextInputStyle.Paragraph },
        { id: "question_3", label: storedQuestions.question_3 || "Question 3", style: TextInputStyle.Paragraph },
        { id: "question_4", label: storedQuestions.question_4 || "Question 4", style: TextInputStyle.Paragraph }
    ].filter(q => q.id === "title" || storedQuestions[q.id]);

    await interaction.showModal(buildModal(questions));
}

export function registerModalHandler(client: Client) {
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isModalSubmit()) return;
        if (interaction.customId !== "task-create-modal") return;

        const results: Record<string, string> = {};

        for (const [key, component] of interaction.fields.fields.entries()) {
            //@ts-expect-error
            results[key] = component.value;
        }

        const connected = await getIntegrationConfigByValue(
            "guildId",
            "discordbot",
            interaction.guildId!
        );

        if (!connected) {
            await interaction.reply({
                content: "This integration is not enabled.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const enabled = await getIntegrationEnabled(
            connected.organizationId,
            "discordbot"
        );

        if (!enabled) {
            await interaction.reply({
                content: "This integration is not enabled.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const storage = await getIntegrationStorage(connected.organizationId, "discordbot");
        const data = (storage?.data ?? {}) as Record<string, unknown>;
        const storedQuestions = (data.questions ?? DEFAULT_QUESTIONS) as Record<string, string>;
        const defaults = (data.defaults ?? {}) as Record<string, string>;

        // Build markdown description from answers
        const title = results.title || "Untitled Task";
        let description = ``;

        const questionLabels: Record<string, string> = {
            question_1: storedQuestions.question_1 || "Question 1",
            question_2: storedQuestions.question_2 || "Question 2",
            question_3: storedQuestions.question_3 || "Question 3",
            question_4: storedQuestions.question_4 || "Question 4"
        };

        for (const [key, value] of Object.entries(results)) {
            if (key === "title") continue;
            if (!value) continue;

            const label = questionLabels[key] || key;
            description += `### ${label}\n${value}\n\n`;
        }

        // Task object to create
        const taskData = {
            title,
            description,
            status: defaults.status || "todo",
            priority: defaults.priority || "none",
            category: defaults.categoryId === "_none_" ? undefined : defaults.categoryId || undefined
        };

        // TODO: Create task in database
        console.log("Creating task:", JSON.stringify(taskData, null, 2));
        const res = await Sayr.me.createTask({
            title: taskData.title,
            description: taskData.description,
            status: taskData.status as any,
            priority: taskData.priority as any,
            category: taskData.category,
            orgId: connected.organizationId,
            integration: {
                id: connected.integrationId,
                name: "discordbot",
                platform: "first-party"
            }
        })
        if (res.success !== true) {
            await interaction.reply({
                content: "❌ Failed to create the task.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        if (res.data)
            await interaction.reply({
                content:
                    `🎉 Your task has been created!\n\n` +
                    `Title: **${res.data.title}**\n` +
                    `View it here: ${res.data.publicPortalUrl}`,
                flags: MessageFlags.Ephemeral
            });
    });
}
