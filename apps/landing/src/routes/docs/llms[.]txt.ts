import { createFileRoute } from "@tanstack/react-router";
import { source } from "@/lib/source";
import { llms } from "fumadocs-core/source";

export const Route = createFileRoute("/docs/llms.txt")({
  server: {
    handlers: {
      GET() {
        return new Response(llms(source).index());
      },
    },
  },
});
