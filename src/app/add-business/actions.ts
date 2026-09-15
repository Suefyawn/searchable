"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/slug";

const Input = z.object({
  name: z.string().trim().min(2).max(120),
  categoryId: z.string().min(1),
  cityId: z.string().min(1),
  address: z.string().trim().min(5).max(300),
  phone: z.string().trim().min(7).max(20),
  whatsapp: z.string().trim().max(20).optional(),
  website: z.string().trim().max(200).optional(),
  description: z.string().trim().min(20).max(2000),
  contactName: z.string().trim().min(2).max(80),
  contactEmail: z.email(),
});

export async function submitBusiness(input: z.infer<typeof Input>): Promise<{ ok: boolean; error?: string; slug?: string }> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields — name, category, city, address, phone and a short description are required." };
  const d = parsed.data;
  const db = await getDb();
  const [city, user] = await Promise.all([db.query.locations.findFirst({ where: eq(schema.locations.id, d.cityId) }), getSessionUser()]);
  if (!city) return { ok: false, error: "Unknown city." };

  const base = slugify(`${d.name}-${city.slug}`);
  const slug = await uniqueSlug(base, async (s) => !!(await db.query.businesses.findFirst({ where: eq(schema.businesses.slug, s), columns: { id: true } })));
  const website = d.website && !/^https?:\/\//.test(d.website) ? `https://${d.website}` : d.website || undefined;

  const [row] = await db
    .insert(schema.businesses)
    .values({
      slug,
      name: d.name,
      status: "pending",
      description: d.description,
      primaryCategoryId: d.categoryId,
      cityId: d.cityId,
      address: d.address,
      phone: d.phone,
      whatsapp: d.whatsapp || undefined,
      website,
      email: d.contactEmail,
      ownerUserId: user?.id,
    })
    .returning({ id: schema.businesses.id });
  await db.insert(schema.businessCategoryLinks).values({ businessId: row.id, categoryId: d.categoryId }).onConflictDoNothing();
  if (user) await db.insert(schema.businessClaims).values({ businessId: row.id, userId: user.id, status: "pending", message: `Submitted by ${d.contactName}` });
  await db.insert(schema.analyticsEvents).values({ name: "business_submitted", props: { businessId: row.id, contactName: d.contactName, contactEmail: d.contactEmail } });
  return { ok: true, slug };
}
