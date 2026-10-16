# Third-party notices

The MIT license in this repository applies to original TAKE7 code. It does not relicense dependencies, model weights, fonts, or other third-party material. Consult each installed package and model’s own license before redistribution or commercial use.

## Comfy workflow template

TAKE7’s experimental LTX graph is derived from the official Comfy-Org workflow template:

- Source: https://github.com/Comfy-Org/workflow_templates/blob/main/blueprints/text_to_video_ltx_2_3.json
- Repository license: https://github.com/Comfy-Org/workflow_templates/blob/main/LICENSE
- License text verified from the upstream repository on 2026-10-16. The `main` URL can change; pin the source revision when publishing a release.

The upstream MIT notice follows:

> MIT License
>
> Copyright (c) 2023-present Comfy Org
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

## Models and interface packages

SDXL, LTX-2.3, its LoRA, and the Gemma text encoder must be obtained separately under their respective model licenses. They are not distributed with TAKE7. Open weights do not imply permission for every use. Check model cards and downstream output obligations.

Runtime and development dependencies are listed in `package.json` and resolved in `package-lock.json`, including React, TanStack Start/Router, Base UI, Hugeicons, the Comfy SDK, Hono, and Zod. Preserve the applicable package notices when redistributing a build. TAKE7’s use of the Hugeicons free package does not grant rights to unrelated premium icon assets.

## Original concept artwork

`public/brand/directions.webp` (three design mockups) and `public/brand/doorway.webp` (fictional portal preview artwork) were generated separately using the image-generation tool during TAKE7 development. They are visual concept assets, **not outputs from TAKE7’s Comfy workflows**, and are not evidence of open-weights generation. Review the generation service’s applicable asset-use terms before redistribution; this notice does not assert a separate copyright or model license for generated artwork.

Before claiming an Open Weights Only entry, replace demo output artwork with outputs from your verified eligible SDXL/LTX workflows and retain model/version and generation records. Review each model’s license and the competition’s rules independently.

### Bundled fonts

DM Sans and Space Grotesk are distributed through `@fontsource-variable/dm-sans` and `@fontsource-variable/space-grotesk`. They are loaded locally, under their SIL Open Font License notices in the installed packages. WebP copies of the original concept PNGs are optimized for delivery without changing their creative content.
