import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { getBusiness } from "@/db/queries/directory";
import { requireUser } from "@/lib/auth";
import { CLAIM_CONTACT, domainOf, readInviteToken } from "@/lib/claims";
import { formatDate } from "@/lib/format";
import { ClaimForm, CodeEntry } from "./claim-form";

export const metadata = { title: "Claim this business", robots: { index: false } };
export const dynamic = "force-dynamic";

const STEPS = ["Prove it is yours", "Manage the listing free", "Optional: Verified badge"];

export default async function ClaimPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ t?: string }> }) {
  const { slug } = await params;
  const { t } = await searchParams;
  const user = await requireUser(`/claim/${slug}${t ? `?t=${encodeURIComponent(t)}` : ""}`);
  const b = await getBusiness(slug);
  if (!b) notFound();
  const db = await getDb();
  const claim = await db.query.businessClaims.findFirst({ where: and(eq(schema.businessClaims.businessId, b.id), eq(schema.businessClaims.userId, user.id)) });
  const invite = t ? readInviteToken(t) : null;
  const inviteEmailMatches = !!invite && invite.businessId === b.id && !!b.email && invite.email === b.email.toLowerCase();
  const managed = !!(b.claimedAt || b.ownerUserId);
  const mine = managed && b.ownerUserId === user.id;

  return (
    <div className="container-x py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Claim a listing</p>
        <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{b.name}</h1>
        <p className="mt-2 text-[15px] text-2">
          {[b.primaryCategory?.name, b.area?.name, b.city?.name].filter(Boolean).join(" · ")}
          {b.phone ? ` · ${b.phone}` : ""} · <Link href={`/b/${b.slug}`} className="underline underline-offset-4">see the listing</Link>
        </p>

        <ol className="mt-6 flex flex-wrap gap-x-6 gap-y-1 border-y border-line py-2.5 text-[13px] text-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className="font-display text-base text-[var(--text)]">{i + 1}</span> {s}
            </li>
          ))}
        </ol>

        <div className="mt-8">
          {mine ? (
            <Done b={b} />
          ) : managed ? (
            <div className="space-y-3 text-[15px]">
              <p className="font-medium">This listing is already managed by its owner.</p>
              <p className="text-2">
                If you believe that is wrong, <Link href={`/contact?about=claim&subject=${encodeURIComponent(`Ownership dispute: ${b.name}`)}`} className="underline underline-offset-4">tell us</Link> and an editor will look into it.
              </p>
            </div>
          ) : claim?.status === "approved" ? (
            <Done b={b} />
          ) : claim?.status === "pending" && claim.method === "email_domain" && claim.verificationCode ? (
            <CodeEntry slug={b.slug} claimId={claim.id} sentTo={claim.evidenceUrl?.replace(/^mailto:/, "") ?? "your mailbox"} />
          ) : claim?.status === "pending" && claim.method === "phone" ? (
            <div className="space-y-4 text-[15px]">
              <p className="font-medium">One more step: send us this code from the listed number</p>
              <p className="border-y-2 border-[var(--rule)] py-4 text-center font-mono text-3xl tracking-[0.3em]">{claim.verificationCode}</p>
              <ol className="list-decimal space-y-1.5 pl-5 text-2">
                <li>
                  From <strong className="text-[var(--text)]">{b.whatsapp ?? b.phone}</strong>, send <em>CLAIM {claim.verificationCode}</em> by WhatsApp or SMS to <strong className="text-[var(--text)]">{CLAIM_CONTACT.whatsapp}</strong>.
                </li>
                <li>Or email {CLAIM_CONTACT.email} asking us to call the listed number; we read the code back to whoever answers.</li>
                <li>An editor confirms within one working day and you get an email. The code is valid for 7 days.</li>
              </ol>
              <p className="text-[13px] text-3">Submitted {formatDate(claim.createdAt)}. Wrong number on the listing? Mention it in the message and we will fix it after verifying another way.</p>
            </div>
          ) : claim?.status === "pending" ? (
            <div className="space-y-3 text-[15px]">
              <p className="font-medium">Thanks, your document is with our editors.</p>
              <p className="text-2">We check it against the listing and reply by email within two working days. Submitted {formatDate(claim.createdAt)}.</p>
            </div>
          ) : (
            <>
              {claim?.status === "rejected" ? (
                <p className="mb-6 border-l-2 border-[var(--text)] pl-3 text-[15px]">
                  Your earlier claim was not approved{claim.decisionNote ? `: ${claim.decisionNote}` : ""}. You can try again with a different proof.
                </p>
              ) : null}
              {invite && !inviteEmailMatches ? <p className="mb-6 border-l-2 border-[var(--text)] pl-3 text-[15px]">This invitation link does not match this listing or has expired. Pick another proof below.</p> : null}
              <ClaimForm
                business={{ id: b.id, slug: b.slug, name: b.name, phone: b.phone, whatsapp: b.whatsapp, website: b.website, domain: domainOf(b.website), email: b.email }}
                user={{ name: user.name, email: user.email }}
                inviteToken={inviteEmailMatches ? t : undefined}
                inviteEmailMatches={inviteEmailMatches}
                contact={CLAIM_CONTACT}
              />
            </>
          )}
        </div>

        <div className="mt-12 grid gap-6 border-t border-line pt-6 text-[14px] text-2 sm:grid-cols-3">
          <div>
            <p className="font-medium text-[var(--text)]">Why claim</p>
            <p className="mt-1">Correct details and hours, add photos and services, get enquiries on WhatsApp, reply to reviews. Free, always.</p>
          </div>
          <div>
            <p className="font-medium text-[var(--text)]">How we verify</p>
            <p className="mt-1">Only proof tied to the listing counts: its email domain, its phone number, or a document with its name. Never a screenshot or a promise.</p>
          </div>
          <div>
            <p className="font-medium text-[var(--text)]">Verified badge</p>
            <p className="mt-1">After claiming, you can pay for the Verified badge (Rs 9,900 a year): checked by us, ranked above free listings, followed link to your site.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Done({ b }: { b: { id: string; name: string; slug: string; isVerified: boolean } }) {
  return (
    <div className="space-y-4 text-[15px]">
      <p className="font-medium">You manage {b.name}.</p>
      <p className="text-2">Open the dashboard to update details, add photos and services, and answer enquiries.</p>
      <div className="flex flex-wrap gap-3">
        <Link href={`/business/${b.id}`} className="inline-flex h-10 items-center bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800">
          Open dashboard
        </Link>
        {!b.isVerified ? (
          <Link href={`/business/${b.id}/upgrade`} className="inline-flex h-10 items-center border border-line px-4 text-sm font-medium hover:bg-surface-2">
            Get the Verified badge
          </Link>
        ) : null}
      </div>
    </div>
  );
}
