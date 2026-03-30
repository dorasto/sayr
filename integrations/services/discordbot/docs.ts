export const docs = `
Sayr integrates with Discord via a slash-command bot, letting your team create and reference tasks without leaving Discord.

- **Create tasks with \`/sayr create\`** — Run the command in any channel to open a form and create a Sayr task. The task appears on your board instantly.
- **Templates** — Define multiple task templates, each with its own questions and default values. Users pick a template when running \`/sayr create\`.
- **Default channel routing** — Set a default Discord channel ID where Sayr sends task notifications.
- **Server-scoped** — Each Sayr organization connects to exactly one Discord server. All commands and notifications stay within that server.

---

### Configuration options

#### Settings

- **Server ID** — The ID of the Discord server Sayr is allowed to operate in.
- **Default Channel ID** — Where Sayr posts task notifications by default.

#### Templates

Templates control what users see when they run \`/sayr create\`. Each template is independent — you can have one for bug reports, another for feature requests, and so on.

**Per-template options:**

- **Template Name** — Shown in the template picker when a user runs \`/sayr create\`. Keep it short and descriptive (e.g. *Bug Report*, *Feature Request*).
- **Title Prefix** — Automatically prepended to the task title if not already present (e.g. \`[BUG]\`). Leave blank to disable.
- **Description** — A short note shown in the template picker to help users choose the right one.
- **Questions 1–4** — The prompts shown in the Discord modal form. Each question becomes a paragraph input. Leave a question blank to hide it — you can use as few as zero and as many as four.
- **Default Status** — The status applied to every task created with this template (e.g. *Backlog*, *To Do*).
- **Default Priority** — The priority applied to every task created with this template.
- **Default Category** — Optionally assign new tasks to a specific category automatically.

**How templates work at runtime:**

- If **no templates** are configured, \`/sayr create\` returns an error asking an admin to set up templates.
- If there is **exactly one template**, the form opens immediately — no picker is shown.
- If there are **two or more templates**, users first see a select menu to pick a template, then the form opens.

---

### Using Sayr Cloud

The Sayr Discord Bot is already running on Sayr's infrastructure — you just need to invite it.

1. Invite the Sayr bot to your server using the \`applications.commands\` and \`bot\` scopes  
2. Copy your Server ID and Default Channel ID  
3. Paste them into the Settings page above  
4. Create at least one template in the Templates page  

---

### Self-hosting

If you're hosting your own instance:

1. Create a Discord application at https://discord.com/developers/applications  
2. Add a Bot to the application and copy the bot token  
3. Invite the bot to your server using the \`applications.commands\` and \`bot\` scopes  
4. Enter the bot token, Server ID, and Default Channel ID into the Settings page above  
5. Create at least one template in the Templates page  
`;