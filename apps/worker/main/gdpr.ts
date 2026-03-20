import type { JobGroups } from "@repo/queue";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { auth, db, getOrganizations, schema } from "@repo/database";
import { eq } from "drizzle-orm";
import { listAllUserFiles, uploadGdprExport } from "@repo/storage";
import crypto from "node:crypto";
import { sendEmail } from "@repo/util/email";

export async function gdprExportWorker(job: JobGroups["main"] & { type: "gdpr_export" }) {
    const userId = job.payload.userId;
    const traceAsync = createTraceAsync();

    // CORE USER PROFILE
    const user = await traceAsync("user", () =>
        db.query.user.findFirst({
            where: () => eq(auth.user.id, userId)
        })
    );

    // LINKED ACCOUNTS
    const accounts = await traceAsync("accounts", () =>
        db.query.account.findMany({
            where: () => eq(auth.account.userId, userId)
        })
    );

    // SESSIONS (redacted)
    const sessions = await traceAsync("sessions", () =>
        db.query.session.findMany({
            where: () => eq(auth.session.userId, userId)
        })
    );

    // ORGANIZATIONS
    const orgs = await traceAsync("orgs", () => getOrganizations(userId));

    const privateIds = orgs
        .map((o) => o.privateId)
        .filter((id): id is string => Boolean(id));

    const memberships = await traceAsync("memberships", () =>
        db.query.member.findMany({
            where: () => eq(schema.member.userId, userId)
        })
    );

    // CONTENT
    const tasks = await traceAsync("tasks", () =>
        db.query.task.findMany({
            where: () => eq(schema.task.createdBy, userId)
        })
    );

    const comments = await traceAsync("comments", () =>
        db.query.taskComment.findMany({
            where: () => eq(schema.taskComment.createdBy, userId)
        })
    );

    const timeline = await traceAsync("timeline", () =>
        db.query.taskTimeline.findMany({
            where: () => eq(schema.taskTimeline.actorId, userId)
        })
    );

    const votes = await traceAsync("votes", () =>
        db.query.taskVote.findMany({
            where: () => eq(schema.taskVote.userId, userId)
        })
    );

    // NOTIFICATIONS
    const notifications = await traceAsync("notifications", () =>
        db.query.notification.findMany({
            where: () => eq(schema.notification.userId, userId)
        })
    );

    // FILES
    const fileUrls = await traceAsync("files", () =>
        listAllUserFiles(userId, privateIds)
    );
    // Final payload
    const exportPayload = {
        generatedAt: new Date().toISOString(),
        user: user || null,
        accounts: accounts.map((a) => ({
            ...a,
            accessToken: undefined,
            refreshToken: undefined,
            password: undefined,
        })),
        sessions: sessions.map((s) => ({
            ...s,
            token: undefined
        })),
        organizations: orgs,
        memberships,
        content: {
            tasks,
            comments,
            timeline,
            votes
        },
        notifications,
        files: fileUrls
    };
    const key = await uploadGdprExport(userId, exportPayload);

    // create token
    const token = crypto
        .createHash("sha256")
        .update(key + process.env.FILE_SALT)
        .digest("hex");

    const downloadUrl = `https://admin.${process.env.VITE_ROOT_DOMAIN}/api/gdpr/export/download?key=${encodeURIComponent(key)}&token=${token}`;
    user?.email && await sendEmail({
        to: user?.email,
        subject: "Your GDPR export is ready",
        html: `
    <p>Your data export is ready.</p>
    <p><a href="${downloadUrl}">Click here to download your export</a></p>
    <p>This link will work only once and will expire automatically.</p>
    `
    });
    return downloadUrl;
};