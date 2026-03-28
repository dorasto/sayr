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