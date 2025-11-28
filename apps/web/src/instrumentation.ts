import { logger } from "@/app/lib/axiom/server";
import { createOnRequestError } from "@axiomhq/nextjs";

export const onRequestError = createOnRequestError(logger);
