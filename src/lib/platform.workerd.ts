/** Cloudflare Workers version of platform.ts; selected by the alias in vite.config.ts. */
import PHOTON from "@cf-wasm/photon/photon.wasm";
import WEBP_ENC from "@jsquash/webp/codec/enc/webp_enc_simd.wasm";
import { env } from "cloudflare:workers";
import type { Bindings } from "./platform";

export type { Bindings, R2Put } from "./platform";

export function bindings(): Bindings {
  return env as Bindings;
}

export const heavyComputeAllowed = false;

export const photonModule = async (): Promise<WebAssembly.Module> => PHOTON;
export const webpEncoderModule = async (): Promise<WebAssembly.Module> => WEBP_ENC;

export async function publicFont(file: string): Promise<ArrayBuffer> {
  const assets = (env as Bindings).ASSETS;
  if (!assets) throw new Error("ASSETS binding missing");
  const res = await assets.fetch(new Request(`https://assets.local/fonts/${file}`));
  if (!res.ok) throw new Error(`font ${file}: ${res.status}`);
  return res.arrayBuffer();
}
