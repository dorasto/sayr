export const docs = `
Sayr integrates with Discord via a slash-command bot, letting your team create and reference tasks without leaving Discord.

- **Create tasks with \`/sayr create\`** — Run the command in any channel to create a Sayr task. The task appears on your board instantly.
- **Configurable questions** — Choose which fields your team is asked when creating a task from Discord. Leave a question blank to disable it.
- **Default task values** — Set defaults for status, priority, and category so new tasks are created with consistent settings.
- **Default channel routing** — Set a default Discord channel ID where Sayr sends task notifications. Override per-task if needed.
- **Server-scoped** — Each Sayr organization connects to exactly one Discord server. All commands and notifications stay within that server.

---

### Configuration options

These match the fields in the Settings page:

- **Server ID** — The Discord server Sayr is allowed to operate in.  
- **Default Channel ID** — Where Sayr posts task notifications by default.  
- **Questions** — Customize the prompts shown when running \`/sayr create\`.  
- **Defaults** — Pre-fill status, priority, and category for all new tasks.

---

### Using Sayr Cloud

The Sayr Discord Bot is already running on Sayr's infrastructure — you just need to invite it.

1. Invite the Sayr bot to your server using the \`applications.commands\` and \`bot\` scopes  
2. Copy your Server ID and Default Channel ID  
3. Paste them into the Settings page above  

---

### Self-hosting

If you're hosting your own instance:

1. Create a Discord application at https://discord.com/developers/applications  
2. Add a Bot to the application and copy the bot token  
3. Invite the bot to your server using the \`applications.commands\` and \`bot\` scopes  
4. Enter the bot token, Server ID, and Default Channel ID into the Settings page above  
`;