import { auth } from "@repo/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { withAxiom } from "@/app/lib/axiom/server";

const handlers = toNextJsHandler(auth.handler);

export const GET = withAxiom(handlers.GET);
export const POST = withAxiom(handlers.POST);