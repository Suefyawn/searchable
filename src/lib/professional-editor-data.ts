import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

/** Option lists the professional editor needs (cities and areas). */
export async function professionalEditorOptions() {
  const db = await getDb();
  const [cities, areas] = await Promise.all([
    db.query.locations.findMany({ where: eq(schema.locations.kind, "city"), orderBy: [asc(schema.locations.name)], columns: { id: true, name: true } }),
    db.query.locations.findMany({ where: eq(schema.locations.kind, "area"), orderBy: [asc(schema.locations.name)], columns: { id: true, name: true, cityId: true } }),
  ]);
  return { cities, areas };
}
