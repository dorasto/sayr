/* ────────────────────────────
   API versions
──────────────────────────── */
import v1 from "./api/v1";

/* ────────────────────────────
   Realtime
──────────────────────────── */
import { ws } from "./ws";
import { WS_EVENTS } from "./ws/types";

/* ────────────────────────────
   Client config
──────────────────────────── */
import {
   setToken,
   setHeaders,
   setBaseUrl,
   resetClient,
   setHooks,
} from "./client";

/* ────────────────────────────
   Named exports (power users)
──────────────────────────── */

/**
 * Sayr Public API — Version 1.
 *
 * @since v1.0.0
 */
export const SayrV1 = v1;


/**
 * Create a WebSocket connection for public real‑time updates.
 */
export const SayrWS = ws;

/**
 * Typed WebSocket event constants.
 */
export const SayrWSEvents = WS_EVENTS;

/**
 * Global client configuration helpers.
 */
export const SayrClient = {
   setToken,
   setHeaders,
   setBaseUrl,
   resetClient,
   setHooks,
};

/* ────────────────────────────
   Default facade
──────────────────────────── */

/**
 * Sayr Public SDK.
 *
 * Read‑only access to public Sayr data via REST and WebSockets.
 *
 * @since v1.0.0
 */
const Sayr: {
   /**
    * Client configuration helpers.
    */
   client: typeof SayrClient;

   /**
    * Versioned API namespaces.
    */
   v1: typeof v1;

   /**
    * Alias for the current API version (`v1`).
    *
    * @since v1.0.0
    */
   org: typeof v1.org;
   me: typeof v1.me;

   /**
    * WebSocket helper for real‑time updates.
    */
   ws: typeof ws;

   /**
    * WebSocket event constants.
    */
   WS_EVENTS: typeof WS_EVENTS;
} = {
   // client configuration
   client: SayrClient,

   // APIs
   v1,
   org: v1.org,
   me: v1.me,

   // realtime
   ws,
   WS_EVENTS
};

export default Sayr;

/* ────────────────────────────
   Types & shared helpers
──────────────────────────── */
export * from "./types";
export * from "./shared";
export * from "./ws/types";