"use client";
import { AxiomJSTransport, Logger } from "@axiomhq/logging";
import { nextJsFormatters } from "@axiomhq/nextjs/client";
import { createUseLogger, createWebVitalsComponent } from "@axiomhq/react";
import axiomClient from "@/app/lib/axiom/axiom";

export const logger = new Logger({
	transports: [
		new AxiomJSTransport({ axiom: axiomClient, dataset: process.env.NEXT_PUBLIC_SAYR_FRONTEND_AXIOM_DATASET! }),
	],
	formatters: nextJsFormatters,
});

const useLogger = createUseLogger(logger);
const WebVitals = createWebVitalsComponent(logger);

export { useLogger, WebVitals };
