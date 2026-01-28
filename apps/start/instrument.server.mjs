import * as Sentry from "@sentry/tanstackstart-react";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// Only initialize Sentry if DSN is provided (for self-hosted instances that may not use Sentry)
if (process.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,

    // Set environment to differentiate between dev and production
    environment:
      process.env.NODE_ENV === "production" ? "production" : "development",

    // Set release version for proper source map matching
    release: process.env.VITE_SENTRY_RELEASE || `start@${process.env.npm_package_version || "dev"}`,

    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    enableLogs: true,

    integrations: [
      nodeProfilingIntegration(),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for tracing.
    // We recommend adjusting this value in production.
    // Learn more at https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
    tracesSampleRate: 1.0,

    // Set sampling rate for profiling - this is evaluated only once per SDK.init call
    profileSessionSampleRate: 1.0,

    // Trace lifecycle automatically enables profiling during active traces
    profileLifecycle: 'trace',
  });
}
