import { buildPrompt, type Settings } from "./studio";
export type Graph = Record<
  string,
  {
    class_type: string;
    inputs: Record<string, unknown>;
    _meta?: { title: string };
  }
>;
export function imageWorkflow(
  s: Settings,
  checkpoint = "sd_xl_base_1.0.safetensors",
): Graph {
  const [width, height] =
    s.ratio === "9:16"
      ? [768, 1344]
      : s.ratio === "1:1"
        ? [1024, 1024]
        : [1344, 768];
  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: checkpoint },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: buildPrompt(s), clip: ["1", 1] },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: "text, watermark, blurry, malformed anatomy, low quality",
        clip: ["1", 1],
      },
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: { width, height, batch_size: 1 },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed: s.seed,
        steps: 28,
        cfg: 6,
        sampler_name: "dpmpp_2m",
        scheduler: "karras",
        denoise: 1,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
      },
    },
    "6": {
      class_type: "VAEDecode",
      inputs: { samples: ["5", 0], vae: ["1", 2] },
    },
    "7": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "TAKE7", images: ["6", 0] },
    },
  };
}
// One-pass text-to-video graph based on the official Comfy LTX-2.3 blueprint.
// No partner nodes: models run on the chosen Comfy deployment or local GPU.
export function videoWorkflow(
  s: Settings,
  models = {
    checkpoint: "ltx-2.3-22b-dev-fp8.safetensors",
    encoder: "gemma_3_12B_it_fp4_mixed.safetensors",
    lora: "ltx-2.3-22b-distilled-lora-384.safetensors",
  },
): Graph {
  const [width, height] =
    s.ratio === "9:16"
      ? [448, 768]
      : s.ratio === "1:1"
        ? [640, 640]
        : [768, 448];
  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: models.checkpoint },
    },
    "2": {
      class_type: "LTXAVTextEncoderLoader",
      inputs: {
        text_encoder: models.encoder,
        ckpt_name: models.checkpoint,
        device: "default",
      },
    },
    "3": {
      class_type: "LTXVAudioVAELoader",
      inputs: { ckpt_name: models.checkpoint },
    },
    "4": {
      class_type: "LoraLoaderModelOnly",
      inputs: { model: ["1", 0], lora_name: models.lora, strength_model: 0.5 },
    },
    "5": {
      class_type: "CLIPTextEncode",
      inputs: { text: buildPrompt(s), clip: ["2", 0] },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { text: "text, watermark, cartoon, low quality", clip: ["2", 0] },
    },
    "7": {
      class_type: "LTXVConditioning",
      inputs: { positive: ["5", 0], negative: ["6", 0], frame_rate: 24 },
    },
    "8": {
      class_type: "EmptyLTXVLatentVideo",
      inputs: { width, height, length: 97, batch_size: 1 },
    },
    "9": {
      class_type: "LTXVEmptyLatentAudio",
      inputs: {
        audio_vae: ["3", 0],
        frames_number: 97,
        frame_rate: 24,
        batch_size: 1,
      },
    },
    "10": {
      class_type: "LTXVConcatAVLatent",
      inputs: { video_latent: ["8", 0], audio_latent: ["9", 0] },
    },
    "11": { class_type: "RandomNoise", inputs: { noise_seed: s.seed } },
    "12": {
      class_type: "CFGGuider",
      inputs: {
        model: ["4", 0],
        positive: ["7", 0],
        negative: ["7", 1],
        cfg: 1,
      },
    },
    "13": {
      class_type: "KSamplerSelect",
      inputs: { sampler_name: "euler_ancestral_cfg_pp" },
    },
    "14": {
      class_type: "ManualSigmas",
      inputs: {
        sigmas:
          "1.0, 0.99375, 0.9875, 0.98125, 0.975, 0.909375, 0.725, 0.421875, 0.0",
      },
    },
    "15": {
      class_type: "SamplerCustomAdvanced",
      inputs: {
        noise: ["11", 0],
        guider: ["12", 0],
        sampler: ["13", 0],
        sigmas: ["14", 0],
        latent_image: ["10", 0],
      },
    },
    "16": {
      class_type: "LTXVSeparateAVLatent",
      inputs: { av_latent: ["15", 0] },
    },
    "17": {
      class_type: "VAEDecodeTiled",
      inputs: {
        samples: ["16", 0],
        vae: ["1", 2],
        tile_size: 512,
        overlap: 64,
        temporal_size: 4096,
        temporal_overlap: 4,
      },
    },
    "18": {
      class_type: "LTXVAudioVAEDecode",
      inputs: { samples: ["16", 1], audio_vae: ["3", 0] },
    },
    "19": {
      class_type: "CreateVideo",
      inputs: { images: ["17", 0], audio: ["18", 0], fps: 24 },
    },
    "20": {
      class_type: "SaveVideo",
      inputs: {
        video: ["19", 0],
        filename_prefix: "TAKE7",
        format: "mp4",
        codec: "h264",
      },
    },
  };
}
export function validateGraph(graph: Graph) {
  const ids = new Set(Object.keys(graph));
  for (const [id, node] of Object.entries(graph)) {
    if (!node.class_type || !node.inputs) throw new Error(`Invalid node ${id}`);
    for (const v of Object.values(node.inputs)) {
      if (
        Array.isArray(v) &&
        v.length === 2 &&
        typeof v[0] === "string" &&
        typeof v[1] === "number" &&
        !ids.has(v[0])
      )
        throw new Error(`Missing dependency ${v[0]}`);
    }
  }
  return graph;
}
