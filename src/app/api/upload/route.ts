import { NextResponse } from "next/server";
import { getSessionUser, hasRole } from "@/lib/auth";
import { canEditBusiness } from "@/lib/business-editor-data";
import { rateLimit } from "@/lib/rate-limit";
import { ALLOWED_TYPES, DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, MAX_UPLOAD_BYTES, storeDocument, storeImage } from "@/lib/storage";

// Ingestion, sends and image processing take longer than the 10 s default; Hobby allows up to 60.
export const maxDuration = 60;

/**
 * POST multipart/form-data { file, variant: article|logo|cover|photo|evidence|avatar|cv, businessId?, alt? }
 * Editors can upload anything; business owners can upload for businesses they manage; any signed-in user
 * can upload claim evidence, a profile photo (avatar) or a CV (PDF) for their own professional profile.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });
  const rl = await rateLimit("upload", 60, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const variant = String(form?.get("variant") ?? "photo");
  const businessId = form?.get("businessId") ? String(form.get("businessId")) : null;
  const alt = form?.get("alt") ? String(form.get("alt")).slice(0, 200) : undefined;

  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (!["article", "logo", "cover", "photo", "evidence", "avatar", "post", "cv"].includes(variant)) return NextResponse.json({ error: "Unknown variant." }, { status: 400 });

  // Documents (CVs) take a different path: stored as is, PDF only, smaller cap.
  if (variant === "cv") {
    if (!DOCUMENT_TYPES.has(file.type)) return NextResponse.json({ error: "Upload the CV as a PDF." }, { status: 415 });
    if (file.size > MAX_DOCUMENT_BYTES) return NextResponse.json({ error: `PDF is too large (max ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB).` }, { status: 413 });
    try {
      const stored = await storeDocument(Buffer.from(await file.arrayBuffer()), { mimeType: file.type, originalName: file.name, folder: "cv" });
      return NextResponse.json(stored);
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: "That file could not be stored." }, { status: 422 });
    }
  }

  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Use a JPEG, PNG, WebP, GIF or AVIF image." }, { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: `Image is too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).` }, { status: 413 });

  // evidence / avatar: any signed-in user, unguessable URL, never listed publicly.
  const selfService = variant === "evidence" || variant === "avatar" || variant === "post";
  const allowed = selfService || hasRole(user, "editor") || (businessId ? await canEditBusiness(user, businessId) : false);
  if (!allowed) return NextResponse.json({ error: "You do not have permission to upload here." }, { status: 403 });

  const storeVariant = variant === "evidence" || variant === "post" ? "photo" : variant === "avatar" ? "logo" : (variant as "article" | "logo" | "cover" | "photo");
  try {
    const stored = await storeImage(Buffer.from(await file.arrayBuffer()), { variant: storeVariant, alt, originalName: file.name });
    return NextResponse.json(stored);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "That file could not be processed as an image." }, { status: 422 });
  }
}
