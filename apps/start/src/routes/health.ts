// routes/health.ts
import { db } from '@repo/database'
import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'

export const Route = createFileRoute('/health')({
    server: {
        handlers: {
            GET: async () => {
                const checks = {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    database: await checkDatabase(),
                    version: process.env.npm_package_version,
                }

                return Response.json(checks)
            },
        },
    },
})

async function checkDatabase() {
    const start = Date.now()

    try {
        // Drizzle-native connectivity check
        await db.execute(sql`select 1`)

        return {
            status: 'connected',
            latency: Date.now() - start,
        }
    } catch (error) {
        return {
            status: 'error',
            error:
                error instanceof Error
                    ? error.message
                    : 'Unknown database error',
        }
    }
}