import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import postgres from "postgres";

/*
 * Content migration from Supabase (Postgres) to D1 (SQLite), docs/schema-notes.md.
 *
 *   DATABASE_URL=postgresql://... npm run db:export                 -> .data/export.sql
 *   DATABASE_URL=... npm run db:export -- --since 2026-09-19T00:00Z -> only rows created or updated after that
 *   npx wrangler d1 execute searchable-staging --remote --file .data/export.sql
 *   DATABASE_URL=... npm run db:export -- --verify searchable-staging  -> row counts and spot checks against D1
 *
 * Every row becomes `INSERT ... ON CONFLICT(id) DO UPDATE`, so re-running is idempotent. Column types come from
 * information_schema: timestamps become epoch milliseconds, booleans 0/1, jsonb a JSON string, dates ISO text.
 * Tables rebuilt by the app (search_documents) or meaningless across hosts (sessions, verifications) are skipped.
 */

const SKIP = new Set(["search_documents", "sessions", "verifications", "__drizzle_migrations"]);
const args = process.argv.slice(2);
const since = args.includes("--since") ? new Date(args[args.indexOf("--since") + 1]) : null;
const verify = args.includes("--verify") ? args[args.indexOf("--verify") + 1] : null;
const url = process.env.DATABASE_URL;
if (!url || !url.startsWith("postgres")) throw new Error("DATABASE_URL must be the Supabase session-pooler URL");
// max_pipeline 0: the transaction pooler (6543) stalls on pipelined queries; the option is missing from the driver types.
const sql = postgres(url, { max: 1, prepare: false, max_pipeline: 0 } as Parameters<typeof postgres>[1]);

type Col = { name: string; type: string; pk: boolean };
type Table = { name: string; cols: Col[]; selfRefs: string[] };

async function tables(): Promise<Table[]> {
  const rows = await sql<{ table_name: string; column_name: string; data_type: string; ordinal_position: number }[]>`
    select c.table_name, c.column_name, c.data_type, c.ordinal_position
    from information_schema.columns c join information_schema.tables t on t.table_name = c.table_name and t.table_schema = c.table_schema
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE' order by c.table_name, c.ordinal_position`;
  const pks = await sql<{ table_name: string; column_name: string }[]>`
    select tc.table_name, kcu.column_name from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
    where tc.table_schema = 'public' and tc.constraint_type = 'PRIMARY KEY'`;
  const pkSet = new Set(pks.map((p) => `${p.table_name}.${p.column_name}`));
  const map = new Map<string, Col[]>();
  for (const r of rows) {
    if (SKIP.has(r.table_name)) continue;
    if (!map.has(r.table_name)) map.set(r.table_name, []);
    map.get(r.table_name)!.push({ name: r.column_name, type: r.data_type, pk: pkSet.has(`${r.table_name}.${r.column_name}`) });
  }
  // Parents before children so foreign keys hold even without deferral.
  const fks = await sql<{ child: string; parent: string; column_name: string }[]>`
    select tc.table_name as child, ccu.table_name as parent, kcu.column_name from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
    join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
    where tc.table_schema = 'public' and tc.constraint_type = 'FOREIGN KEY'`;
  const names = [...map.keys()];
  const ordered: string[] = [];
  const visit = (n: string, stack: string[]) => {
    if (ordered.includes(n) || stack.includes(n)) return;
    for (const f of fks) if (f.child === n && f.parent !== n && map.has(f.parent)) visit(f.parent, [...stack, n]);
    ordered.push(n);
  };
  for (const n of names) visit(n, []);
  return ordered.map((name) => ({ name, cols: map.get(name)!, selfRefs: fks.filter((f) => f.child === name && f.parent === name).map((f) => f.column_name) }));
}

/** Rows of a self-referencing table (locations, categories, comments) with every parent before its children. */
function parentsFirst(rows: Record<string, unknown>[], selfRefs: string[]): Record<string, unknown>[] {
  if (!selfRefs.length) return rows;
  const done = new Set<string>();
  const out: Record<string, unknown>[] = [];
  let pending = rows;
  while (pending.length) {
    const ready = pending.filter((r) => selfRefs.every((c) => r[c] == null || done.has(String(r[c])) || r[c] === r.id));
    if (!ready.length) throw new Error("self-reference cycle among " + pending.length + " rows");
    for (const r of ready) {
      out.push(r);
      done.add(String(r.id));
    }
    pending = pending.filter((r) => !ready.includes(r));
  }
  return out;
}

function lit(v: unknown, type: string): string {
  if (v === null || v === undefined) return "NULL";
  if (type.startsWith("timestamp")) return String(v instanceof Date ? v.getTime() : new Date(v as string).getTime());
  if (type === "boolean") return v ? "1" : "0";
  if (type === "jsonb" || type === "json") return str(JSON.stringify(v));
  if (type === "date") return str(v instanceof Date ? v.toISOString().slice(0, 10) : String(v));
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "bigint") return v.toString();
  return str(String(v));
}
const str = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function exportSql() {
  const list = await tables();
  const out: string[] = ["PRAGMA defer_foreign_keys = true;"];
  let total = 0;
  for (const t of list) {
    const hasUpdated = t.cols.some((c) => c.name === "updated_at");
    const hasCreated = t.cols.some((c) => c.name === "created_at");
    const where = since ? (hasUpdated ? sql`where updated_at > ${since}` : hasCreated ? sql`where created_at > ${since}` : sql``) : sql``;
    const rows = parentsFirst((await sql`select * from ${sql(t.name)} ${where}`) as unknown as Record<string, unknown>[], t.selfRefs);
    const colList = t.cols.map((c) => `"${c.name}"`).join(", ");
    const pk = t.cols.filter((c) => c.pk).map((c) => `"${c.name}"`);
    const updates = t.cols.filter((c) => !c.pk).map((c) => `"${c.name}" = excluded."${c.name}"`);
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      // The run reports lived in one settings value on Postgres; on D1 they are rows of automation_reports.
      if (t.name === "settings" && r.key === "automation:reports") {
        const items = ((r.value as { items?: { id: string; slot: string; at: string; report: string; published?: number; updated?: number; errors?: number }[] })?.items ?? []);
        for (const it of items) out.push(`INSERT INTO "automation_reports" ("id", "slot", "at", "report", "published", "updated", "errors") VALUES (${str(it.id)}, ${str(it.slot)}, ${new Date(it.at).getTime()}, ${str(it.report)}, ${it.published ?? "NULL"}, ${it.updated ?? "NULL"}, ${it.errors ?? "NULL"}) ON CONFLICT("id") DO UPDATE SET "report" = excluded."report";`);
        console.log(`  automation:reports -> ${items.length} rows of automation_reports`);
        continue;
      }
      const values = t.cols.map((c) => lit(r[c.name], c.type)).join(", ");
      const conflict = pk.length ? ` ON CONFLICT(${pk.join(", ")}) DO ${updates.length ? `UPDATE SET ${updates.join(", ")}` : "NOTHING"}` : "";
      out.push(`INSERT INTO "${t.name}" (${colList}) VALUES (${values})${conflict};`);
    }
    total += rows.length;
    console.log(`${t.name.padEnd(28)} ${String(rows.length).padStart(6)} rows`);
  }
  const tooBig = out.filter((l) => l.length > 95_000);
  if (tooBig.length) throw new Error(`${tooBig.length} statement(s) over D1 limit: ${tooBig.map((l) => l.slice(0, 60)).join(" | ")}`);
  mkdirSync(".data", { recursive: true });
  writeFileSync(".data/export.sql", out.join("\n") + "\n");
  console.log(`\n${total} rows in ${list.length} tables -> .data/export.sql${since ? ` (since ${since.toISOString()})` : ""}`);
}

function d1<T>(db: string, query: string): T[] {
  // wrangler is run through its own entry file, without a shell, so the query text is passed intact on Windows too.
  const raw = execFileSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "d1", "execute", db, "--remote", "--json", "--command", query], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
  const m = raw.match(/\[[\s\S]*\]/);
  return m ? (JSON.parse(m[0])[0].results as T[]) : [];
}

async function verifyAgainst(db: string) {
  const list = await tables();
  let bad = 0;
  for (const t of list) {
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from ${sql(t.name)}`;
    const [{ m }] = d1<{ m: number }>(db, `select count(*) as m from "${t.name}"`);
    const ok = Number(n) === Number(m);
    if (!ok) bad++;
    console.log(`${ok ? "ok " : "DIFF"} ${t.name.padEnd(28)} postgres ${String(n).padStart(6)}  d1 ${String(m).padStart(6)}`);
    const idCol = t.cols.find((c) => c.pk && c.name === "id");
    if (!idCol || !Number(n)) continue;
    // Spot check: ten random rows, every column compared after the same conversion the export applied.
    const sample = await sql`select * from ${sql(t.name)} order by random() limit 10`;
    const ids = sample.map((r) => str(String((r as Record<string, unknown>).id))).join(", ");
    const remote = d1<Record<string, unknown>>(db, `select * from "${t.name}" where id in (${ids})`);
    for (const row of sample) {
      const r = row as Record<string, unknown>;
      const got = remote.find((x) => x.id === r.id);
      if (!got) {
        bad++;
        console.log(`   missing ${t.name} ${r.id}`);
        continue;
      }
      for (const c of t.cols) {
        const want = lit(r[c.name], c.type);
        const have = got[c.name] === null || got[c.name] === undefined ? "NULL" : typeof got[c.name] === "number" ? String(got[c.name]) : str(String(got[c.name]));
        if (want !== have && !(c.type === "jsonb" && JSON.stringify(JSON.parse(want.slice(1, -1).replace(/''/g, "'"))) === JSON.stringify(JSON.parse(String(got[c.name]))))) {
          bad++;
          console.log(`   ${t.name}.${c.name} ${r.id}: postgres ${want.slice(0, 60)} d1 ${have.slice(0, 60)}`);
        }
      }
    }
  }
  console.log(bad ? `\n${bad} differences` : "\nall tables match");
  if (bad) process.exitCode = 1;
}

(verify ? verifyAgainst(verify) : exportSql())
  .then(() => sql.end())
  .then(() => process.exit())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
