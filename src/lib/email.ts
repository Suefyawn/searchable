import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type Email = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Override the sender (must be on the verified domain), e.g. a reply from editorial@searchable.pk. */
  from?: string;
  replyTo?: string;
  /** Extra RFC headers such as In-Reply-To and References so replies thread in the recipient's client. */
  headers?: Record<string, string>;
};
/** transactional: confirmations, invoices, password mail. bulk: newsletter issues. */
export type EmailKind = "transactional" | "bulk";

/**
 * Sending budget, so a newsletter can never burn through the provider's free allowance and block a
 * subscriber confirmation. Resend free: 100 emails a day, 3,000 a month. Defaults sit just under both;
 * bulk mail stops earlier and leaves the remainder for transactional mail.
 */
const DAILY_CAP = Number(process.env.EMAIL_DAILY_CAP ?? 95);
const MONTHLY_CAP = Number(process.env.EMAIL_MONTHLY_CAP ?? 2900);
const BULK_RESERVE = Number(process.env.EMAIL_BULK_RESERVE ?? 15);

type Budget = { day: string; dayCount: number; month: string; monthCount: number };

export class EmailBudgetExceeded extends Error {
  constructor(public readonly scope: "day" | "month") {
    super(scope === "day" ? "Daily email allowance used up; sending resumes tomorrow" : "Monthly email allowance used up");
  }
}

async function readBudget(): Promise<Budget> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, "email:budget") });
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const b = (row?.value as Budget | undefined) ?? { day, dayCount: 0, month, monthCount: 0 };
  if (b.day !== day) Object.assign(b, { day, dayCount: 0 });
  if (b.month !== month) Object.assign(b, { month, monthCount: 0 });
  return b;
}

async function writeBudget(b: Budget) {
  const db = await getDb();
  await db.insert(schema.settings).values({ key: "email:budget", value: b }).onConflictDoUpdate({ target: schema.settings.key, set: { value: b, updatedAt: new Date() } });
}

/** How many more emails of this kind may go out today (and this month). */
export async function emailAllowance(kind: EmailKind = "bulk"): Promise<{ today: number; month: number }> {
  const b = await readBudget();
  const reserve = kind === "bulk" ? BULK_RESERVE : 0;
  return { today: Math.max(0, DAILY_CAP - reserve - b.dayCount), month: Math.max(0, MONTHLY_CAP - reserve - b.monthCount) };
}

/**
 * Email adapter. `EMAIL_PROVIDER=local` writes an .eml file to .data/outbox so you can inspect sends
 * without any account (on a runtime without a writable disk it only logs). `resend` uses the Resend API in
 * production. `none` (staging) counts the send and drops it. Every send counts against the budget.
 */
export async function sendEmail(email: Email, kind: EmailKind = "transactional"): Promise<{ id: string }> {
  const provider = process.env.EMAIL_PROVIDER ?? "local";
  const from = email.from ?? process.env.EMAIL_FROM ?? "Searchable <daily@searchable.pk>";

  const budget = await readBudget();
  const reserve = kind === "bulk" ? BULK_RESERVE : 0;
  if (budget.monthCount + reserve >= MONTHLY_CAP) throw new EmailBudgetExceeded("month");
  if (budget.dayCount + reserve >= DAILY_CAP) throw new EmailBudgetExceeded("day");

  let id: string;
  if (provider === "resend" && process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({ from, to: email.to, subject: email.subject, html: email.html, text: email.text, replyTo: email.replyTo, headers: email.headers });
    if (error) throw new Error(error.message);
    id = data?.id ?? "";
  } else if (provider === "none") {
    id = `dropped-${Date.now()}`;
    console.info(`[email:none] ${email.subject} -> ${email.to}`);
  } else {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const extra = Object.entries(email.headers ?? {})
      .map(([k, v]) => `${k}: ${v}\n`)
      .join("");
    const eml = `From: ${from}\nTo: ${email.to}\nSubject: ${email.subject}\nDate: ${new Date().toUTCString()}\n${extra}Content-Type: text/html; charset=utf-8\n\n${email.html}`;
    try {
      const [{ mkdirSync, writeFileSync }, path] = await Promise.all([import("node:fs"), import("node:path")]);
      const dir = path.join(process.cwd(), ".data", "outbox");
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, `${id}.eml`), eml);
      console.info(`[email:local] ${email.subject} -> ${email.to}  (.data/outbox/${id}.eml)`);
    } catch {
      console.info(`[email:local] ${email.subject} -> ${email.to}  (no writable disk here)`);
    }
  }
  budget.dayCount += 1;
  budget.monthCount += 1;
  await writeBudget(budget);
  return { id };
}
