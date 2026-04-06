# {{name}} Integration

## Setup

1. Enable the integration:
   ```bash
   export INTEGRATION_{{idUpperCase}}_ENABLED=true
   ```

2. Restart the backend

3. Configure the integration in the admin UI

## Pages

### Settings
Configure the base URL for the external API.

### Items
View and manage synced items with full CRUD support.

### Sync
Preview data from the external API before syncing.

## API Routes

The integration exposes these endpoints:

- `GET /settings` - Fetch settings
- `PATCH /settings` - Update settings
- `GET /items` - List all items
- `POST /items` - Create a new item
- `PATCH /items/:id` - Update an item
- `DELETE /items/:id` - Delete an item
- `GET /sync/preview` - Preview external API data