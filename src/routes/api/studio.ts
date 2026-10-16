import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/studio")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        (await import("../../server/engine")).handle(request),
      POST: async ({ request }) =>
        (await import("../../server/engine")).handle(request),
      DELETE: async ({ request }) =>
        (await import("../../server/engine")).handle(request),
    },
  },
});
