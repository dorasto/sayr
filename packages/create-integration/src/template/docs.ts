export const docs = `
# {{name}} Integration

## Overview
This integration syncs data with external APIs.

## Setup
1. Configure the base URL in Settings
2. Enable the integration

## Pages

### Settings
Configure the external API URL and connection settings.

### Items
View and manage synced items. Supports CRUD operations:
- Create new items
- Edit existing items
- Delete items

### Sync
Preview data from the external API before syncing.

## API Routes
Configure API endpoints in the integration manifest:
\`\`\`typescript
// GET /settings - Fetch settings
// PATCH /settings - Update settings
// GET /items - List items
// POST /items - Create item
// PATCH /items/:id - Update item
// DELETE /items/:id - Delete item
// GET /sync/preview - Preview external API data
\`\`\`
`;