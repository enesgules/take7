# Models and workflow validation

## SDXL image path

The image graph uses `sd_xl_base_1.0.safetensors` (override server filename with `COMFY_SDXL_CHECKPOINT`), standard checkpoint/text/sampler/VAE/save nodes, 28 steps, CFG 6, DPM++ 2M with Karras scheduling. It renders 1344×768 landscape, 768×1344 portrait, or 1024×1024 square. These landscape/portrait dimensions approximate the named aspect ratios.

Obtain SDXL from its official publisher and review the checkpoint’s license. Installing a differently named or incompatible model requires configuration and a fresh validation render.

## LTX-2.3 experimental video path

The app uses these filenames:

- Checkpoint: `ltx-2.3-22b-dev-fp8.safetensors`
- Text encoder: `gemma_3_12B_it_fp4_mixed.safetensors`
- LoRA: `ltx-2.3-22b-distilled-lora-384.safetensors`

The graph is derived from the [official Comfy LTX-2.3 blueprint](https://github.com/Comfy-Org/workflow_templates/blob/main/blueprints/text_to_video_ltx_2_3.json). TAKE7 implements a simplified one-pass text-to-video/audio path. It does not reproduce every stage or quality setting of that blueprint. It uses 97 frames at 24 fps (about four seconds), with 768×448, 448×768, or 640×640 output dimensions. Camera behavior comes from prompt conditioning.

A current compatible Comfy environment must supply the named LTX nodes, audio/video codecs, and all checkpoint components. Review the official model cards for hardware requirements and license restrictions. An open-weights model is not automatically unrestricted for every commercial use. Model weights are not included here.

**Status: graph construction and node references can be checked locally; real GPU execution and perceptual quality remain unverified.** `TAKE7_ENABLE_LTX=false` is the default. Before enabling it:

1. Confirm every node type and input exists in your deployment.
2. Confirm the exact checkpoint, encoder, and LoRA files are installed.
3. Run the exported graph with one short scene; inspect frame count, dimensions, playback, audio, and output artifacts.
4. Test cancellation, polling, download, and restart recovery on that deployment.
5. Save validation evidence and costs; adjust the graph if required, then re-export it.

The code contains no partner API nodes in these two graphs. Whether this meets the contest’s “Open Weights Only” definition, and whether hosted inference is permitted, must be checked against current official rules. LTX is the video model for that path; do not claim a qualifying LTX submission until the end-to-end video workflow actually runs.
