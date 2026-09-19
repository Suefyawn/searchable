import { sql } from "drizzle-orm";
import { getDb, rawQuery } from "@/db";

export type UserFootprint = { businesses: number; professionals: number; posts: number; comments: number; reviews: number; orders: number; claims: number; sessions: number };

/** Counts of what a user owns or has done, for the admin user pages. */
export async function userFootprint(id: string): Promise<UserFootprint> {
  const db = await getDb();
  const [r] = await rawQuery<UserFootprint>(
    db,
    sql`select
      (select count(*) from businesses where owner_user_id = ${id}) as businesses,
      (select count(*) from professionals where owner_user_id = ${id}) as professionals,
      (select count(*) from posts where author_id = ${id}) as posts,
      (select count(*) from comments where author_id = ${id}) as comments,
      (select count(*) from business_reviews where user_id = ${id}) as reviews,
      (select count(*) from orders where user_id = ${id}) as orders,
      (select count(*) from business_claims where user_id = ${id}) as claims,
      (select count(*) from sessions where user_id = ${id} and expires_at > ${Date.now()}) as sessions`,
  );
  return r;
}
