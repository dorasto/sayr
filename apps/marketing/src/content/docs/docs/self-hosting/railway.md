---
title: Self-Hosting on Railway
description: Guide for deploying Sayr on Railway

---

:::note
An official Railway template is coming soon to make this process one-click. This guide provides the groundwork for manual configuration in the meantime.
:::

## Overview

Sayr is composed of several services that work together. To host it on Railway, you will need to deploy the application containers and provision the required databases.

### Required Services

1.  **PostgreSQL**: Primary database.
2.  **Redis**: Used for queues and caching.
3.  **S3-compatible Storage**: For file uploads (e.g., MinIO, AWS S3, R2).

### Application Containers

The following Docker images need to be deployed.

-   `ghcr.io/dorasto/sayr-backend`: The core API server.
-   `ghcr.io/dorasto/sayr-start`: The frontend application.
-   `ghcr.io/dorasto/sayr-worker`: Handles background jobs (like GitHub sync).
-   `ghcr.io/dorasto/sayr-caddy`: Reverse proxy and SSL termination (deployed on a separate server, or as a sidecar).

## Environment Variables

You will need to configure following environment variables across your services. These will be automatically populated by Railway. Not all of them are required, such as S3 configurations & Doras/GitHub credentials.

## Deployment Steps 
coming soon
