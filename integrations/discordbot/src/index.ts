import {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  Events,
  ChatInputCommandInteraction,
  SlashCommandBuilder
} from "discord.js";

import * as sayrCreate from "./commands/create";
import Sayr from "@sayrio/public";
import { EventSource } from "eventsource"
import { getIntegrationConfig, getIntegrationStorage, setIntegrationStorage, db, schema } from "@repo/database";
import { eq } from "drizzle-orm";
const API_URL = process.env.APP_ENV === "development" ? "http://localhost:5468/api/public" : "http://backend:5468/api/public";
Sayr.client.setToken(process.env.SAYR_API_KEY)
Sayr.client.setBaseUrl(API_URL)

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN");
  process.exit(1);
}

// ----- Discord Client -----
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ----- Build /sayr command directly here -----
const sayrCommand = {
  data: new SlashCommandBuilder()
    .setName("sayr")
    .setDescription("Sayr commands")
    .addSubcommand(sayrCreate.data),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "create") return sayrCreate.execute(interaction);
  }
};

// ----- Add commands to collection -----
client.commands = new Collection();
client.commands.set(sayrCommand.data.name, sayrCommand);

// ----- Register modal handler for create command -----
sayrCreate.registerModalHandler(client);

// ----- REST -----
const rest = new REST({ version: "10" }).setToken(token);

async function registerCommands() {
  await rest.put(Routes.applicationCommands(client.user?.id || ""), {
    body: [sayrCommand.data.toJSON()]
  });
  console.log("Commands registered.");
}

// ----- Interaction handler -----
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = client.commands.get(interaction.commandName);
  if (cmd) await cmd.execute(interaction);
});

// ----- Ready -----
client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user?.tag}`);
  registerCommands();
});

// ----- Login -----
client.login(token);

Sayr.sse(
  `${API_URL.replace("/api/public", "/api")}/events?channel=system&key=${process.env.SAYR_API_KEY}`,
  {
    [Sayr.EVENTS.CONNECTION_STATUS]: (msg: any) => {
      console.log(
        `SSE Connected → clientId=${msg.clientId}`
      );
    },
    [Sayr.EVENTS.UPDATE_TASK]: async (t: any) => {
      await handleUpdateTask(t);
    }
  },
  {
    eventSource: EventSource,
    eventSourceOptions: {
      fetch: (input: any, init: any) =>
        fetch(input, {
          ...init,
          headers: {
            ...init?.headers,
            "User-Agent": "integration DiscordBot v1"
          }
        })
    }
  }
);

async function handleUpdateTask(t: any) {
  // 1. Load integration config
  const connected = await getIntegrationConfig(
    t.organizationId,
    "discordbot",
    "guildId"
  );
  const connectedChannelId = await getIntegrationConfig(
    t.organizationId,
    "discordbot",
    "channelId"
  );

  if (!connected || !connectedChannelId) return;

  const orgId = connected.organizationId;

  // 2. Load stored messages
  const storage = await getIntegrationStorage(orgId, "discordbot-task-messages");
  //@ts-expect-error
  const existing = Array.isArray(storage?.data?.data)
    //@ts-expect-error
    ? storage.data.data
    : [];

  const existingEntry = existing.find((m: any) => m.taskId === t.id);

  // 3. Load guild
  //@ts-expect-error
  let guild = client.guilds.cache.get(connected.value?.guildId as string);
  if (!guild) {
    console.warn("Guild not found:", connected.value);
    return;
  }

  // 4. Determine channel
  //@ts-expect-error
  const channelId = existingEntry?.channelId || connectedChannelId.value?.channelId;

  let channel = guild.channels.cache.get(channelId);
  if (!channel) {
    console.warn("Channel not found:", channelId);
    return;
  }

  // Must be text
  if (!channel.isTextBased()) {
    console.warn("Channel is not text-based, aborting");
    return;
  }

  // 5. Delete if task marked done
  if (t.status === "done" && existingEntry) {
    try {
      await channel.messages.delete(existingEntry.messageId);
    } catch { }

    const updated = existing.filter((m: any) => m.taskId !== t.id);

    await setIntegrationStorage(orgId, "discordbot-task-messages", {
      data: updated
    });

    console.log(
      "Deleted Discord task message and removed from DB:",
      t.id
    );
    return;
  }

  // 6. Build embed
  const updatedAt = t.updatedAt
    ? new Date(t.updatedAt).getTime()
    : Date.now();

  const ts = Math.floor(updatedAt / 1000);

  const orgSlug = await db.query.organization.findFirst({
    where: eq(schema.organization.id, t.organizationId),
    columns: { slug: true }
  });

  const projectUrl = `${process.env.APP_ENV === "development"
    ? `http://${orgSlug?.slug}.${process.env.VITE_ROOT_DOMAIN}:3000`
    : `https://${orgSlug?.slug}.${process.env.VITE_ROOT_DOMAIN}`
    }/${t.shortId}`;

  const embed = {
    title: t.title || "Task Updated",
    color: 0x5865f2,
    fields: [
      {
        name: "Status",
        value: t.status || "Unknown",
        inline: true
      },
      {
        name: "Priority",
        value: t.priority || "None",
        inline: true
      },
      {
        name: "Last Updated",
        value: `<t:${ts}:f> (<t:${ts}:R>)`,
        inline: false
      },
      {
        name: "Task",
        value: projectUrl,
        inline: false
      }
    ]
  };

  //
  // 7. If NEW → create message
  //
  if (!existingEntry) {
    const msg = await channel.send({
      content: t.message || "",
      embeds: [embed]
    });

    const newEntry = {
      organizationId: orgId,
      taskId: t.id,
      guildId: guild.id,
      channelId: channelId,
      messageId: msg.id,
      lastUpdatedAt: Date.now()
    };

    const updated = [...existing, newEntry];

    await setIntegrationStorage(orgId, "discordbot-task-messages", {
      data: updated
    });

    console.log("Created new Discord task message:", newEntry);
    return;
  }

  //
  // 8. UPDATE existing message
  //
  try {
    await channel.messages.edit(existingEntry.messageId, {
      content: t.message || "",
      embeds: [embed]
    });

    const updatedEntry = {
      organizationId: orgId,
      taskId: t.id,
      guildId: guild.id,
      channelId: channelId,
      messageId: existingEntry.messageId,
      lastUpdatedAt: Date.now()
    };

    const updated = existing.map((m: any) =>
      m.taskId === t.id ? updatedEntry : m
    );

    await setIntegrationStorage(orgId, "discordbot-task-messages", {
      data: updated
    });

    console.log("Updated existing Discord task message:", updatedEntry);
  } catch (err) {
    console.error("Failed to update message, recreating:", err);

    const msg = await channel.send({
      content: t.message || "",
      embeds: [embed]
    });

    const updatedEntry = {
      organizationId: orgId,
      taskId: t.id,
      guildId: guild.id,
      channelId: channelId,
      messageId: msg.id,
      lastUpdatedAt: Date.now()
    };

    const updated = existing.map((m: any) =>
      m.taskId === t.id ? updatedEntry : m
    );

    await setIntegrationStorage(orgId, "discordbot-task-messages", {
      data: updated
    });

    console.log("Recreated Discord task message:", updatedEntry);
  }
}