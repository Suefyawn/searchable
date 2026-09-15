import { desc } from "drizzle-orm";
import { AdminPage } from "@/components/admin";
import { Img } from "@/components/img";
import { getDb, schema } from "@/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Everything that has been uploaded. Click a URL to copy it into an editor field. */
export default async function AdminMedia() {
  const db = await getDb();
  const rows = await db.query.media.findMany({ orderBy: [desc(schema.media.createdAt)], limit: 200 });
  const total = rows.reduce((a, r) => a + (r.bytes ?? 0), 0);
  return (
    <AdminPage title="Media" description={`${rows.length} files · ${(total / 1024 / 1024).toFixed(1)} MB. Uploads are converted to WebP with 480 and 960 px renditions; originals are not kept. Every photo carries its credit and licence.`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map((m) => (
          <figure key={m.id} className="border border-line">
            <Img src={m.url} alt={m.alt ?? ""} aspect="4/3" sizes="240px" />
            <figcaption className="space-y-0.5 p-2 text-[11px] text-3">
              <p className="truncate font-mono text-[10.5px]" title={m.url}>
                <a href={m.url} target="_blank" rel="noopener" className="underline">
                  {m.url.split("/").pop()}
                </a>
              </p>
              <p>
                {m.width}×{m.height} · {((m.bytes ?? 0) / 1024).toFixed(0)} KB · {formatDate(m.createdAt)}
              </p>
              {m.alt ? <p className="truncate">{m.alt}</p> : null}
            </figcaption>
          </figure>
        ))}
        {!rows.length ? <p className="col-span-full py-8 text-center text-2">No uploads yet.</p> : null}
      </div>
    </AdminPage>
  );
}
