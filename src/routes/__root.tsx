import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import styles from "../styles.css?url";
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TAKE7 — One scene. Seven possibilities." },
      {
        name: "description",
        content:
          "An open cinematic playground. Explore seven directions, branch your best take, and keep every creative decision.",
      },
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  component: () => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
  notFoundComponent: () => (
    <main className="error-page">
      <h1>This scene is missing.</h1>
      <a href="/">Back to the studio</a>
    </main>
  ),
  errorComponent: () => (
    <main className="error-page">
      <h1>Something interrupted this take.</h1>
      <a href="/">Reload the studio</a>
    </main>
  ),
});
