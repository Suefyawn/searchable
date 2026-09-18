import { NextResponse } from "next/server";
import { getSessionUser, hasRole } from "@/lib/auth";
import { canEditBusiness } from "@/lib/business-editor-data";
import { RENDITION_WIDTHS, storeVariantFor, type UploadVariant } from "@/lib/images";
import { rateLimit } from "@/lib/rate-limit";
import { ALLOWED_TYPES, DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, MAX_UPLOAD_BYTES, NoServerResize, storeDocument, storeImage, storePreparedImage } from "@/lib/storage";

// Ingestion, sends and image processing take longer than the 10 s default; Hobby allows up to 60.
export const maxDuration = 60;

const VARIANTS: UploadVariant[] = ["article", "logo", "cover", "photo", "evidence", "avatar", "post", "cv"];
const bytes = async (f: File) => new Uint8Array(await f.arrayBuffer());

/**
 * POST multipart/form-data with `variant` (article|logo|cover|photo|evidence|avatar|cv|post), `businessId?`, `alt?` and
 * either the browser-prepared set `master`, `r480`, `r960` (WebP, resized on the device: ADR-43) or a raw `file`,
 * which only a server allowed to spend CPU will resize. Editors can upload anything; business owners can upload
 * for businesses they manage; any signed-in user can upload claim evidence, an avatar, a post photo or a CV (PDF).
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });
  const rl = await rateLimit("upload", 60, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const master = form?.get("master");
  const variant = String(form?.get("variant") ?? "photo") as UploadVariant;
  const businessId = form?.get("businessId") ? String(form.get("businessId")) : null;
  const alt = form?.get("alt") ? String(form.get("alt")).slice(0, 200) : undefined;

  if (!VARIANTS.includes(variant)) return NextResponse.json({ error: "Unknown variant." }, { status: 400 });

  // Documents (CVs) take a different path: stored as is, PDF only, smaller cap.
  if (variant === "cv") {
    if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
    if (!DOCUMENT_TYPES.has(file.type)) return NextResponse.json({ error: "Upload the CV as a PDF." }, { status: 415 });
    if (file.size > MAX_DOCUMENT_BYTES) return NextResponse.json({ error: `PDF is too large (max ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB).` }, { status: 413 });
    try {
      return NextResponse.json(await storeDocument(await bytes(file), { mimeType: file.type, originalName: file.name, folder: "cv" }));
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: "That file could not be stored." }, { status: 422 });
    }
  }

  // evidence / avatar / post: any signed-in user, unguessable URL, never listed publicly.
  const selfService = variant === "evidence" || variant === "avatar" || variant === "post";
  const allowed = selfService || hasRole(user, "editor") || (businessId ? await canEditBusiness(user, businessId) : false);
  if (!allowed) return NextResponse.json({ error: "You do not have permission to upload here." }, { status: 403 });
  const storeVariant = storeVariantFor(variant);

  if (master instanceof File) {
    const renditions = RENDITION_WIDTHS.map((w) => form?.get(`r${w}`));
    if (!renditions.every((r) => r instanceof File)) return NextResponse.json({ error: "Send the 480 and 960 px renditions with the master." }, { status: 400 });
    if (master.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: `Image is too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).` }, { status: 413 });
    try {
      const prepared = { master: await bytes(master), renditions: Object.fromEntries(await Promise.all(RENDITION_WIDTHS.map(async (w, i) => [w, await bytes(renditions[i] as File)]))) as Record<(typeof RENDITION_WIDTHS)[number], Uint8Array> };
      return NextResponse.json(await storePreparedImage(prepared, { variant: storeVariant, alt, originalName: master.name }));
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Those files could not be stored." }, { status: 422 });
    }
  }

  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Use a JPEG, PNG, WebP, GIF or AVIF image." }, { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: `Image is too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).` }, { status: 413 });
  try {
    return NextResponse.json(await storeImage(await bytes(file), { variant: storeVariant, alt, originalName: file.name }));
  } catch (err) {
    if (err instanceof NoServerResize) return NextResponse.json({ error: "Your browser could not prepare this image. Try a different browser or a JPEG or PNG file." }, { status: 422 });
    console.error(err);
    return NextResponse.json({ error: "That file could not be processed as an image." }, { status: 422 });
  }
}
