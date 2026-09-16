import { revalidatePath } from "next/cache";
import { withAdminApi } from "@/lib/admin-api";
import { nowInPakistan } from "@/lib/today";
import { HijriOffset, pakistanHijri, readHijriOffset, umalquraDate, writeHijriOffset } from "@/lib/today/hijri";

export const dynamic = "force-dynamic";

/** GET /api/admin/today: the Islamic date the site shows, the table date, and the sighting offset in force. */
export const GET = withAdminApi(async () => {
  const offset = await readHijriOffset();
  const t = nowInPakistan();
  return { date: t.iso, pakistan: pakistanHijri(t.date, offset.days), umalqura: umalquraDate(t.date), offset };
});

/**
 * POST /api/admin/today { "days": -1 | 0 | 1, "note"?, "sourceUrl"? }
 * Set after a Ruet-e-Hilal Committee announcement: days is how far Pakistan's date sits from the Umm al-Qura
 * table (1 when Pakistan started the month a day earlier than the table, -1 a day later). Reset to 0 when the
 * next month's sighting matches the table again.
 */
export const POST = withAdminApi(async (_req, { body }) => {
  const d = HijriOffset.omit({ setAt: true }).parse(body);
  const saved = await writeHijriOffset(d);
  revalidatePath("/islamic-date");
  revalidatePath("/today");
  revalidatePath("/prayer-times", "layout");
  return { ok: true, offset: saved, pakistan: pakistanHijri(new Date(), saved.days) };
});
