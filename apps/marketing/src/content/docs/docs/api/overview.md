---
title: API Overview
description: Introduction to the Sayr API
sidebar:
   order: 1
---

# API Overview

Sayr provides a REST API for programmatic access to your data.

## Base URL

```
https://api.sayr.io
```

## Authentication

All API requests require authentication via session cookies or API tokens.

```bash
curl -X GET "https://api.sayr.io/organizations" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

## Response Format

All responses are JSON formatted:

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Rate Limiting

- 100 requests per minute for authenticated users
- 10 requests per minute for unauthenticated requests

## Endpoints

### Organizations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/organizations` | List your organizations |
| GET | `/organizations/:slug` | Get organization details |
| POST | `/organizations` | Create an organization |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/organizations/:slug/tasks` | List tasks |
| GET | `/tasks/:id` | Get task details |
| POST | `/organizations/:slug/tasks` | Create a task |
| PATCH | `/tasks/:id` | Update a task |
| DELETE | `/tasks/:id` | Delete a task |

See the individual endpoint documentation for full details.
