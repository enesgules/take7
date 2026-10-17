# TAKE7 competition demo runbook

## Current readiness

Checked the local workspace on 2026-10-17 without printing credential values:

| Check | Result |
| --- | --- |
| Local `.env` present | No |
| Comfy API key configured | No |
| Comfy base URL configured | No |
| Valid studio access token configured | No |
| LTX enabled | No |
| Local NVIDIA device / driver detected | No / No |

These checks describe this workspace, not a separate hosted deployment. No render was submitted and no credits were spent. The blocker for real demo footage is a configured Comfy service with compatible installed models, or an accessible local GPU running the compatible v2 API proxy. Configure credentials privately using [SETUP.md](SETUP.md); never put secrets in a recording, exported project, or public repository. Service configuration is not proof of model readiness or credit balance.

## Prepare a small, inspectable story

Use one original scene: “A courier in a weathered red coat carries a small brass lantern toward a sealed observatory at dusk. The lantern begins to glow as the door opens.” Keep character, costume, object, location, and lighting details stable in the continuity text. Choose a story arc, inspect its beats, then adjust the scene and camera intent before rendering.

Choose **Build a story arc**, preview The threshold, One last move, or What stays, then select **Create seven-shot story**. The seven video drafts are added to the decision reel. Use **Open in studio** on each card to edit, export its Comfy workflow, or render the shot individually. Distinguish it from exploring seven alternative treatments of one scene. An arc changes the narrative beat across cards; treatments change the mood or direction. Neither action should silently start paid generation.

Start with one SDXL image. After that succeeds, validate one LTX video. Reuse completed outputs for recording where possible and label recorded job completion honestly. Do not run a seven-render batch merely to test the UI.

## Real-render acceptance gates

A good build or a valid JSON file is not enough. Record pass/fail evidence for each gate before advertising real video generation.

1. **Engine:** confirm the account balance or approved budget, compatible API target, installed model filenames, and current node schemas. Record the deployment type and date without its secrets.
2. **Image:** submit one take intentionally; observe a real job ID and terminal success; inspect the output; confirm download and re-open work. Compare actual dimensions with the selected graph.
3. **Video:** enable LTX only after model/node verification; submit one take; confirm a successful LTX job and a playable MP4 with the expected roughly four-second duration, 24 fps, and graph dimensions. Inspect audio presence, synchronization, blank frames, corruption, and visible artifacts. Record actual frame count; do not assume the requested 97 frames were emitted exactly.
4. **Provenance:** retain the precise API graph, source scene/continuity text, seed, checkpoint/encoder/LoRA versions and hashes where available, job ID, output hash, render date, runtime, and observed cost. Keep private URLs and tokens outside the public evidence.
5. **Recovery:** reload while a job is pending and confirm correct recovery/polling; verify output playback and download after completion. Validate cancellation once on a deliberately budgeted job; do not infer that cancellation reverses charges. Following an ambiguous submit error, inspect provider history before retrying.
6. **Creative result:** inspect whether the scene and intended beat are recognizable, camera intent is plausible, and key continuity details survive. Record defects rather than hiding them. A seed does not guarantee identity across shots.
7. **Sharing:** open an exported/remixed project in a fresh browser and check its scene, beats, ordering, and settings. Confirm that secret credentials are absent. A recipe share is not a guarantee that private rendered media travels with it.

A simple evidence log can use one row per take: `take name | model/version | workflow hash | job ID (private) | date | output hash | runtime/cost | pass/fail notes`. Preserve the original downloaded media, not only a screen recording.

## 80-second demo script

**0–10 seconds — The story.** Show the scene and the new story-arc control. “A beautiful shot is a start. TAKE7 turns one idea into a story you can direct.” If the canvas shows concept art, keep its preview label visible.

**10–25 seconds — Arc into beats.** Select an arc and show the editable beat sequence. Point out the shared character/location details and one beat-specific change. “The arc gives me structure. I can inspect and rewrite every beat.”

**25–38 seconds — Direction.** Explore the seven treatments or compare two saved alternatives. Show the lens and camera intent for one beat. “I can change the feeling without losing the source idea.” Say these are prompt controls, not physical camera tracking.

**38–55 seconds — Real output.** Play a verified completed LTX clip and briefly show its saved recipe. Identify LTX as the actual video model. If using recorded completion, label it. If real rendering remains blocked, replace this segment with an explicit integration-status explanation; do not pass off preview artwork as generated footage.

**55–68 seconds — Review the sequence.** Reorder a beat and play the storyboard preview. “This is a sequence plan. Continuity is carried through text; the app does not yet stitch the clips into a finished film.”

**68–80 seconds — Reproduce and remix.** Export the project/workflow and open a remix in a fresh session. Show the real repository/demo links only when they exist. “One idea. Seven directions. A story you can make your own.”

This script emphasizes an inspectable creative process. Explain the specific innovation in the final submission rather than claiming the entire concept has never existed.

## Model and asset provenance

The implemented image path uses SDXL; the experimental video path uses LTX-2.3, its distilled LoRA, and a Gemma text encoder. See [MODELS.md](MODELS.md) for exact filenames. These API graphs contain no partner model API nodes. That alone does not establish category eligibility: verify every model’s license and the current competition rules, including hosted inference requirements.

The portal artwork and design board in `public/brand/` were generated separately with an image-generation tool. They are concept assets, not Comfy outputs and not evidence of open-weights generation. Replace demonstration outputs with your own verified eligible SDXL/LTX renders before claiming “Open Weights Only.” Keep the preview-art disclosure where those assets remain. Model and asset licensing still require review.

## Technical uncertainties to resolve

- The LTX graph is a simplified one-pass derivation of an official blueprint, not a verified reproduction of its complete quality pipeline. It has not passed a GPU execution test here.
- `validateGraph` checks node presence and basic reference existence; it does not validate deployment node schemas, output socket types, required inputs, installed weights, or GPU memory.
- Confirm compatibility of the checkpoint, Gemma encoder, distilled LoRA strength, sampler/sigma schedule, LTX audiovisual nodes, and output socket routing on the actual deployment.
- Validate tiled decoding memory use and the video/audio encoding path; a successful sampling stage alone is insufficient.
- Aspect labels are approximate: LTX landscape is 768×448 and portrait is 448×768; SDXL landscape is 1344×768. Avoid claiming exact 16:9 geometry.
- Continuity is text conditioning, without reference-image identity locking, optical matching, or shot-to-shot latent conditioning. Storyboard playback is not stitching or a rendered final film.
- No prize, grant, starter credits, submitted entry, or permanent deployment is guaranteed by this runbook.
