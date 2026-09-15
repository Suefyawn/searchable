"use client";

import Link from "next/link";
import { LocalFilePicker } from "@/components/upload";
import * as React from "react";
import { Alert, Badge, Button, Textarea } from "@/components/ui";
import type { PreviewRow } from "@/lib/import";
import { commitImportAction, previewImportAction } from "./actions";

export function Importer() {
  const [csv, setCsv] = React.useState("");
  const [rows, setRows] = React.useState<PreviewRow[] | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [publish, setPublish] = React.useState(false);
  const [includeDup, setIncludeDup] = React.useState(false);
  const [result, setResult] = React.useState<{ created: { slug: string; name: string }[]; skipped: number } | null>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setCsv(await f.text());
  }

  async function preview() {
    setBusy(true);
    setError("");
    setResult(null);
    const r = await previewImportAction(csv);
    setRows(r.rows);
    if (r.error) setError(r.error);
    setBusy(false);
  }

  async function commit() {
    if (!rows) return;
    const n = rows.filter((r) => r.status === "new" || (includeDup && r.status === "duplicate")).length;
    if (!window.confirm(`Import ${n} businesses as ${publish ? "ACTIVE (live immediately)" : "pending (review queue)"}?`)) return;
    setBusy(true);
    const r = await commitImportAction(rows, { publish, includeDuplicates: includeDup });
    setResult(r);
    setRows(null);
    setCsv("");
    setBusy(false);
  }

  const counts = rows ? { new: rows.filter((r) => r.status === "new").length, duplicate: rows.filter((r) => r.status === "duplicate").length, invalid: rows.filter((r) => r.status === "invalid").length } : null;

  return (
    <div className="space-y-6">
      {result ? (
        <Alert tone="success" title={`Imported ${result.created.length} businesses`}>
          {result.skipped ? `${result.skipped} skipped. ` : ""}
          {result.created.slice(0, 8).map((c) => (
            <Link key={c.slug} href={`/b/${c.slug}`} className="mr-3 underline underline-offset-4">
              {c.name}
            </Link>
          ))}
          {result.created.length > 8 ? "…" : ""} <Link href="/admin/businesses?status=pending" className="underline underline-offset-4">Review queue →</Link>
        </Alert>
      ) : null}

      {!rows ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <LocalFilePicker accept=".csv,text/csv" label="Choose a CSV file" hint="or paste below" onFile={onFile} className="min-w-64 py-3" />
            <a href="/admin/businesses/import/template.csv" className="text-sm underline underline-offset-4">
              Download template
            </a>
            <span className="text-xs text-3">Columns: name, category, city, area, address, phone, whatsapp, website, email, description, tagline, lat, lng, opens, closes, closed_days, services (a;b;c), price_range (1–4)</span>
          </div>
          <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="…or paste CSV here (header row first)" className="min-h-56 font-mono text-[12.5px]" />
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button onClick={preview} disabled={busy || csv.trim().length < 10}>
            {busy ? "Checking…" : "Preview & check duplicates"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 border-y border-line py-3 text-sm">
            <span><strong>{counts!.new}</strong> new</span>
            <span><strong>{counts!.duplicate}</strong> possible duplicates</span>
            <span><strong>{counts!.invalid}</strong> invalid</span>
            <label className="ml-auto flex items-center gap-2"><input type="checkbox" checked={includeDup} onChange={(e) => setIncludeDup(e.target.checked)} /> import duplicates too</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> publish immediately</label>
            <Button size="sm" variant="ghost" onClick={() => setRows(null)}>Back</Button>
            <Button size="sm" onClick={commit} disabled={busy || counts!.new + (includeDup ? counts!.duplicate : 0) === 0}>
              {busy ? "Importing…" : `Import ${counts!.new + (includeDup ? counts!.duplicate : 0)}`}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[13.5px]">
              <thead className="text-left text-xs uppercase tracking-wider text-3">
                <tr className="border-b border-[var(--rule)]">
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Category · City · Area</th>
                  <th className="py-2 pr-3 font-medium">Phone</th>
                  <th className="py-2 pr-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((r) => (
                  <tr key={r.line} className="align-top">
                    <td className="py-2 pr-3 tabular text-3">{r.line}</td>
                    <td className="py-2 pr-3"><Badge tone={r.status === "new" ? "success" : r.status === "duplicate" ? "warning" : "danger"}>{r.status}</Badge></td>
                    <td className="py-2 pr-3 font-medium">{r.input.name}</td>
                    <td className="py-2 pr-3 text-2">{r.resolved ? `${r.resolved.categoryName} · ${r.resolved.cityName}${r.resolved.areaName ? ` · ${r.resolved.areaName}` : ""}` : `${r.input.category} · ${r.input.city}`}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{r.resolved?.phone ?? r.input.phone}</td>
                    <td className="py-2 pr-3 text-xs">
                      {r.problems.map((p) => (
                        <span key={p} className="block text-red-700 dark:text-red-400">{p}</span>
                      ))}
                      {r.duplicates.map((d) => (
                        <span key={d.id} className="block text-2">
                          {d.reason === "phone" ? "Same phone as" : d.reason === "name" ? "Same name as" : `Similar (${Math.round(d.score * 100)}%) to`}{" "}
                          <Link href={`/admin/businesses/${d.id}`} className="underline underline-offset-4">{d.name}</Link> ({d.status})
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
