import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import start from "./dist/server/server.js";
const app = new Hono();
app.use("*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "same-origin");
  await next();
});
app.use(
  "/assets/*",
  serveStatic({
    root: "./dist/client",
    onFound: (_path, c) =>
      c.header("Cache-Control", "public, max-age=31536000, immutable"),
  }),
);
app.use("/brand/*", serveStatic({ root: "./dist/client" }));
app.use("/favicon.svg", serveStatic({ root: "./dist/client" }));
app.all("*", (c) => start.fetch(c.req.raw));
const port = Number(process.env.PORT || 3000);
serve(
  { fetch: app.fetch, port, hostname: process.env.HOST || "0.0.0.0" },
  (info) => console.log(`TAKE7 listening on http://localhost:${info.port}`),
);
