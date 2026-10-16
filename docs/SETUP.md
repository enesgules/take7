# Setup and publication checklist

## What the owner needs to do

No GitHub repository or GPU account is needed to explore the local planning interface. For real renders:

1. Create a Comfy account. Check the current competition rules, deadline, and account credit balance directly with the organizer. Joining is not documented here as a credit grant.
2. Choose an engine: Comfy Cloud is the default SDK target; a Developer Platform deployment supplies a deployment URL; a local GPU installation needs a compatible **v2 API proxy**. The SDK does not send this graph directly to a raw ComfyUI `/prompt` endpoint.
3. Obtain a Comfy API key through the provider’s account interface and place it in the server environment. Never paste it into chat, a public repository, a share URL, or the browser connection dialog.
4. Generate a separate studio token, for example `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Set it as `TAKE7_ACCESS_TOKEN` and use it to unlock the browser session.
5. Confirm the deployment has the SDXL checkpoint, then submit one image. Verify billing and actual output before further renders.
6. Validate the experimental LTX graph with the exact model filenames, then explicitly enable video.

## Environment

Copy `.env.example` to `.env` for local development. For production, configure variables in the hosting service; ensure they are available to the Node process. If your host does not load `.env`, launch with `node --env-file=.env server.mjs` after building.

`COMFY_BASE_URL` unset uses the SDK’s default Cloud surface. Use `https://<deployment>.run.comfy.app` for your Developer Platform deployment or, for example, `http://127.0.0.1:8189` for a local v2 proxy. Local loopback proxies do not require `COMFY_API_KEY` for app readiness. A remote environment requires it. An affirmative readiness response verifies configuration only, not model availability, credit balance, or network health.

`TAKE7_PUBLIC_ORIGIN` should match the deployed HTTPS origin exactly. `TAKE7_DATA_DIR` must be a persistent writable directory: render submission records and cached output files live there. Do not publish this directory. The prototype rate limit is per process (10 submissions/minute), and the studio has one shared token rather than per-user accounts. Use one application instance until shared storage and distributed controls are implemented. Back up data, monitor disk use, and apply a retention policy before long-term hosting.

Job polling, cancellation, and downloads need the configured engine. After an ambiguous submission failure, inspect Comfy job history before creating a new take; a render may still be running and charging credits. Output tickets grant access to an output and should be treated as private links. Changing the studio token invalidates existing tickets.

## Public GitHub and demo release

- Create a repository in your own GitHub account and choose its final name and visibility.
- Inspect changes before pushing. Exclude `.env`, `.data`, API keys, access tokens, private media, and service credentials.
- Include the MIT license, third-party notices, workflow JSON files, and reproducible setup steps.
- Run type checks, automated tests, and a production build. Perform real image and LTX GPU smoke tests separately and record the deployment, model versions, date, and outcomes.
- Deploy a working HTTPS demo. Keep public planning usable without a paid engine, and protect chargeable operations with authentication and quotas.
- Add the actual repository and live demo URLs to the submission only once they exist. Record a real demo and disclose illustrative previews.
- Verify eligibility, deadline, required platform usage, model licensing, video requirements, and category combinations against current official rules before submitting.

No deployment, repository creation, or competition submission is implied by this checklist.

## Container deployment

A two-stage `Dockerfile` builds the app and serves it as the unprivileged `node` user. Build with `docker build -t take7 .` and run with `docker run --rm -p 3000:3000 --env-file .env -v take7-data:/app/.data take7`. Do not put secrets into the image or pass them as build arguments. Put HTTPS in front of the server and set `TAKE7_PUBLIC_ORIGIN` to the public HTTPS origin if your proxy changes the request origin. The Docker image recipe is supplied; it has not been built in this session.

The development preview may run in a short-lived Upstash Box. Such a preview is not durable hosting: projects remain in each visitor’s browser and the box disappears at its advertised expiry. Keep the source and exported project backups independently.
