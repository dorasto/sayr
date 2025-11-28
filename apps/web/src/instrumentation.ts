import { createOnRequestError } from "@axiomhq/nextjs";
import { logger } from "@/app/lib/axiom/server";

export const onRequestError = createOnRequestError(logger);
