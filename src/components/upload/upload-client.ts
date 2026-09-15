"use client";

/**
 * Browser side of uploads: validation with plain messages, a canvas downscale so a 12 MB phone photo goes up
 * as a 1 MB one, and XHR so we can show real progress and cancel. Server rules live in /api/upload.
 */
export type UploadVariant = "article" | "logo" | "cover" | "photo" | "evidence" | "avatar" | "post" | "cv";
export type Uploaded = { url: string; width?: number; height?: number; bytes?: number };

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_PDF_BYTES = 5 * 1024 * 1024;
/** Longest side we keep before upload; the server makes 480/960 renditions from this. */
const DOWNSCALE_TO = 2400;

/** Thrown for problems a retry cannot fix (wrong type, too big). */
export class ValidationError extends Error {}

export function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function validateFile(file: File, kind: "image" | "pdf"): string | null {
  if (kind === "pdf") {
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) return "That is not a PDF. Export your CV as PDF and try again.";
    if (file.size > MAX_PDF_BYTES) return `That PDF is ${humanSize(file.size)}; the limit is 5 MB.`;
    return null;
  }
  if (!IMAGE_TYPES.includes(file.type)) return `${file.name.split(".").pop()?.toUpperCase() ?? "That"} files are not supported. Use JPEG, PNG, WebP, GIF or AVIF.`;
  return null;
}

/** Reads the pixel size without decoding fully (createImageBitmap when available). */
export async function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  try {
    if ("createImageBitmap" in window) {
      const bmp = await createImageBitmap(file);
      const s = { width: bmp.width, height: bmp.height };
      bmp.close();
      return s;
    }
  } catch {
    /* fall through */
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Shrinks big photos in the browser (JPEG/PNG/WebP only; GIF and AVIF pass through). Anything already under
 * the pixel and byte limits is returned as is. Falls back to the original if the canvas path fails.
 */
export async function downscaleImage(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  const size = await imageSize(file);
  if (!size) return file;
  const longest = Math.max(size.width, size.height);
  if (longest <= DOWNSCALE_TO && file.size <= 2 * 1024 * 1024) return file;
  try {
    const scale = Math.min(1, DOWNSCALE_TO / longest);
    const w = Math.round(size.width * scale);
    const h = Math.round(size.height * scale);
    const bmp = await createImageBitmap(file, { resizeWidth: w, resizeHeight: h, resizeQuality: "high" });
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[a-z0-9]+$/i, type === "image/png" ? ".png" : ".jpg"), { type });
  } catch {
    return file;
  }
}

export function uploadFile(file: File, opts: { variant: UploadVariant; businessId?: string; alt?: string; onProgress?: (fraction: number) => void; signal?: AbortSignal }): Promise<Uploaded> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("variant", opts.variant);
    if (opts.businessId) fd.set("businessId", opts.businessId);
    if (opts.alt) fd.set("alt", opts.alt);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let data: (Uploaded & { error?: string }) | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* not json */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.url) resolve(data);
      else reject(new Error(data?.error ?? (xhr.status === 413 ? "That file is too large." : xhr.status === 401 ? "Sign in to upload." : "Upload failed. Check your connection and try again.")));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.onabort = () => reject(new DOMException("Cancelled", "AbortError"));
    opts.signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(fd);
  });
}

/** Full pipeline for one image: validate, downscale, upload with progress. */
export async function uploadImage(file: File, opts: { variant: UploadVariant; businessId?: string; alt?: string; onProgress?: (fraction: number) => void; signal?: AbortSignal }): Promise<Uploaded> {
  const problem = validateFile(file, "image");
  if (problem) throw new ValidationError(problem);
  const prepared = await downscaleImage(file);
  if (prepared.size > MAX_IMAGE_BYTES) throw new ValidationError(`That image is ${humanSize(prepared.size)} even after shrinking; the limit is 8 MB.`);
  return uploadFile(prepared, opts);
}
