import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Button } from "@/components/ui";
import { getDb, schema } from "@/db";
import { NEWSLETTER_TOPICS } from "@/db/schema/newsletter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Newsletter preferences", robots: { index: false } };

async function save(token: string, formData: FormData) {
  "use server";
  const db = await getDb();
  const topics = NEWSLETTER_TOPICS.filter((t) => formData.get(`topic:${t}`) === "on");
  const frequency = formData.get("frequency") === "weekly" ? "weekly" : "daily";
  await db.update(schema.newsletterSubscribers).set({ topics, frequency }).where(eq(schema.newsletterSubscribers.unsubscribeToken, token));
  revalidatePath(`/newsletter/manage`);
}

/** Linked from every issue's footer with the subscriber's unsubscribe token. */
export default async function ManagePage({ searchParams }: { searchParams: Promise<{ token?: string; saved?: string }> }) {
  const { token } = await searchParams;
  const db = await getDb();
  const sub = token ? await db.query.newsletterSubscribers.findFirst({ where: eq(schema.newsletterSubscribers.unsubscribeToken, token) }) : null;
  if (!sub) {
    return (
      <div className="container-x py-20 text-center">
        <h1 className="font-display text-3xl">Link not recognised</h1>
        <p className="mt-2 text-2">Use the “manage preferences” link at the bottom of any Searchable Daily email.</p>
      </div>
    );
  }
  const action = save.bind(null, sub.unsubscribeToken);
  const LABELS: Record<string, string> = { pakistan: "Pakistan", business: "Business", technology: "Technology", ai: "AI", finance: "Finance", cars: "Cars", property: "Property", jobs: "Jobs" };
  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-lg">
        <p className="eyebrow">Searchable Daily</p>
        <h1 className="mt-2 font-display text-3xl">Your preferences</h1>
        <p className="mt-1 text-sm text-2">
          {sub.email} · status: {sub.status}
        </p>
        <form action={action} className="mt-6 space-y-5 border border-line p-5">
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold">Topics</legend>
            <div className="grid grid-cols-2 gap-2 text-[15px]">
              {NEWSLETTER_TOPICS.map((t) => (
                <label key={t} className="inline-flex items-center gap-2">
                  <input type="checkbox" name={`topic:${t}`} defaultChecked={sub.topics.includes(t)} className="accent-brand-700" /> {LABELS[t]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold">Frequency</legend>
            <div className="flex gap-4 text-[15px]">
              <label className="inline-flex items-center gap-2"><input type="radio" name="frequency" value="daily" defaultChecked={sub.frequency === "daily"} className="accent-brand-700" /> Every morning</label>
              <label className="inline-flex items-center gap-2"><input type="radio" name="frequency" value="weekly" defaultChecked={sub.frequency === "weekly"} className="accent-brand-700" /> Weekly digest</label>
            </div>
          </fieldset>
          <div className="flex items-center justify-between">
            <Button type="submit">Save preferences</Button>
            <Link href={`/newsletter/unsubscribe?token=${sub.unsubscribeToken}`} className="text-sm text-3 underline underline-offset-4">
              Unsubscribe
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
