export const docs = `
Sayr integrates with Discord via a slash-command bot, letting your team create and reference tasks without leaving Discord.

- **Create tasks with \`/task\`** — Use the \`/task\` slash command in any Discord channel to create a Sayr task directly. The task appears in your Sayr board immediately.
- **Default channel routing** — Set a default Discord channel ID so task notifications are sent there automatically. Override per-task if needed.
- **Bot token authentication** — The bot connects using a Discord bot token. Sayr never stores OAuth credentials.
- **Server-scoped** — Each Sayr organization connects to one Discord server. Configure the server ID to scope all commands and notifications to the right workspace.

---

### Using Sayr Cloud

The Discord Bot is already running on Sayr's infrastructure — you just need to invite it to your server.

1. Invite the Sayr bot to your Discord server with the \`applications.commands\` and \`bot\` scopes
2. Copy your Discord server ID and default channel ID
3. Paste them into the Settings page above

---

### Self-hosting

You need to create and run your own Discord bot application.

1. Create a Discord application at [discord.com/developers](https://discord.com/developers/applications)
2. Add a Bot to the application and copy the bot token
3. Invite the bot to your server with the \`applications.commands\` and \`bot\` scopes
4. Paste the bot token, server ID, and default channel ID into the Settings page above
`;
