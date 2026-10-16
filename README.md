# TAKE7

**One scene. Seven ways to feel it.**

TAKE7 is a cinematic direction studio: write a scene, branch it into seven visual treatments, compare takes, and arrange a sequence. Each take retains its prompt, seed, lens, aspect ratio, and prompt-guided camera direction. Export the project and concrete ComfyUI API workflows to continue the work outside this app.

Built with React, TanStack Start, Base UI, Hugeicons, and the official `@comfyorg/sdk`. Dependency versions are pinned by `package-lock.json`; do not interpret “latest” as a guarantee about future releases.

## Run locally

Use **Node.js 22.18 or newer** and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open http://localhost:3000. Visit `/brand` for the visual identity and three concept directions. Without credentials, the app is a local, illustrative planning studio. Its pre-made concept artwork is not output from the connected Comfy workflow. You can explore directions and export plans without buying inference credits.

```sh
npm run typecheck
npm test
npm run build
npm start
```

Production needs a persistent, writable `TAKE7_DATA_DIR`, plus environment variables supplied by the host. See [setup](docs/SETUP.md) for credential handling and deployment requirements. This repository does not imply a publicly deployed app or a submitted competition entry.

## Shape your board

Click the project title in the top bar to rename it. The decision reel has a numbered timeline and previous/next controls for reviewing each four-second storyboard card. Reordering preserves the take you are previewing; leaving the reel pauses playback. This is a planning preview, not a stitched video export.

## Compare and recover

The comparison dialog shows each changed creative setting and distinguishes demo illustrations from rendered outputs. Matching seeds help isolate creative choices but do not guarantee identical composition.

Projects save on this device. Invalid remix links leave a valid saved board intact. Opening a valid remix preserves the previous board in device recovery; use **Help → Download recovery file** to retrieve it, then import the file to restore a valid project. Recovery contains one previous board, not a version history. Export important projects separately.

## Enable real rendering

1. Create a Comfy account and choose Comfy Cloud, a Comfy Developer Platform deployment, or a compatible local v2 API proxy.
2. Configure the server environment using `.env.example`. Keep `COMFY_API_KEY` on the server.
3. Create a random `TAKE7_ACCESS_TOKEN` of at least 24 characters. Enter **that studio token**, not your Comfy key, in the app’s connection dialog.
4. Verify an SDXL image render and confirm the checkpoint exists in your chosen environment.
5. Install and validate the LTX models and graph before enabling `TAKE7_ENABLE_LTX=true`.

Rendering may incur charges. The supplied prize list describes awards, including runner-up credits; it does **not** establish that joining grants free credits. Confirm current starter credits and eligibility with the organizer before spending.

## Workflows and limits

- [SDXL image graph](workflows/take7-sdxl-api.json): standard ComfyUI nodes and the SDXL base checkpoint.
- [LTX video graph](workflows/take7-ltx23-api.json): an experimental one-pass graph derived from the official LTX-2.3 blueprint, with audio, 97 frames, and 24 fps. It has **not been validated on a GPU** by this repository’s build checks.
- Run `npx tsx scripts/export-workflows.ts` to regenerate both API graphs from app code.
- Identical seeds support controlled comparison; changing prompts or models does not guarantee the same character, composition, or identity.
- Lens and camera settings are text conditioning, not calibrated camera controls or physical camera trajectories.
- A sequence is a planning arrangement, not an automatically stitched video.
- The shared studio token is suitable for a private prototype. Add individual authentication, durable distributed job control, and usage quotas before a public paid rendering service.

See [models and validation](docs/MODELS.md), [competition plan](docs/COMPETITION.md), [brand directions](docs/BRAND.md), and [third-party notices](THIRD_PARTY.md).

## License

Original TAKE7 application code is under the [MIT license](LICENSE). Models, model outputs, upstream workflow material, icons, fonts, and dependencies have their own terms. No model weights are distributed here.
