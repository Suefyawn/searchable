import { NextResponse } from "next/server";
import { getSessionUser, hasRole } from "@/lib/auth";
import { canEditBusiness } from "@/lib/business-actions";
import { rateLimit } from "@/lib/rate-limit";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, storeImage } from "@/lib/storage";

/**
 * POST multipart/form-data { file, variant: article|logo|cover|photo, businessId?, alt? }
 * Editors can upload anything; business owners can upload for businesses they manage.
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
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Use a JPEG, PNG, WebP, GIF or AVIF image." }, { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: `Image is too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).` }, { status: 413 });
  if (!["article", "logo", "cover", "photo", "evidence"].includes(variant)) return NextResponse.json({ error: "Unknown variant." }, { status: 400 });

  // evidence: a claimant's proof-of-ownership document; any signed-in user, unguessable URL, never linked publicly.
  const allowed = variant === "evidence" || hasRole(user, "editor") || (businessId ? await canEditBusiness(user, businessId) : false);
  if (!allowed) return NextResponse.json({ error: "You do not have permission to upload here." }, { status: 403 });

  try {
    const stored = await storeImage(Buffer.from(await file.arrayBuffer()), { variant: (variant === "evidence" ? "photo" : variant) as "article" | "logo" | "cover" | "photo", alt, originalName: file.name });
    return NextResponse.json(stored);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "That file could not be processed as an image." }, { status: 422 });
  }
}

