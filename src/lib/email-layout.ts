import { BRAND_DEFAULTS } from "@/lib/site-settings";
import { SITE } from "@/lib/utils";

/**
 * One email chrome for everything the site sends (ADR-52): the square-lens mark and wordmark, a hairline rule,
 * the content, a footer with the address and the right links. Same tokens as the site (charcoal ink, navy
 * primary, teal accent, ADR-32), system sans in place of Geist because mail clients do not load web fonts.
 * Tables and inline styles only, 600 px card, no external CSS, one small PNG for the mark.
 *
 * `sendEmail()` wraps any template that is not already a full document, so a template only writes its content.
 */
const B = BRAND_DEFAULTS;
const FONT = `-apple-system, "Segoe UI", Helvetica, Arial, sans-serif`;
const HOST = SITE.url.replace(/^https?:\/\//, "");

export type EmailShell = {
  /** Shown above the content as the email's heading; the subject is the usual choice. */
  title?: string;
  /** Hidden preview text under the subject line in the inbox. */
  preheader?: string;
  /** Small label above the wordmark ("Daily", "Your account", "Invoice"). */
  kicker?: string;
  body: string;
  /** One primary action, rendered as a navy button. */
  cta?: { label: string; href: string };
  /** Footer links (unsubscribe, manage) replace the default account line when given. */
  footerLinks?: { label: string; href: string }[];
  footerNote?: string;
};

/** Inline styles for markdown-rendered or hand-written content so it reads the same in every client. */
export function styleContent(html: string): string {
  return html
    .replace(/<h1(?: [^>]*)?>/g, `<h1 style="font-family:${FONT};font-size:24px;line-height:1.25;letter-spacing:-0.01em;margin:0 0 14px;color:${B.ink}">`)
    .replace(/<h2(?: [^>]*)?>/g, `<h2 style="font-family:${FONT};font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#6b7280;margin:28px 0 8px;padding-top:14px;border-top:1px solid #e5e7eb">`)
    .replace(/<h3(?: [^>]*)?>/g, `<h3 style="font-family:${FONT};font-size:19px;line-height:1.3;margin:14px 0 4px;font-weight:600;color:${B.ink}">`)
    .replace(/<p(?: [^>]*)?>/g, `<p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:${B.ink}">`)
    .replace(/<ul(?: [^>]*)?>/g, `<ul style="padding-left:20px;margin:0 0 12px;font-size:16px;line-height:1.6;color:${B.ink}">`)
    .replace(/<ol(?: [^>]*)?>/g, `<ol style="padding-left:20px;margin:0 0 12px;font-size:16px;line-height:1.6;color:${B.ink}">`)
    .replace(/<blockquote(?: [^>]*)?>/g, `<blockquote style="margin:0 0 12px;padding:2px 0 2px 14px;border-left:3px solid ${B.accent};color:${B.slate}">`)
    .replace(/<code(?: [^>]*)?>/g, `<code style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;background:#f3f4f6;padding:1px 5px">`)
    .replace(/<table(?: [^>]*)?>/g, `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:0 0 12px;font-size:15px">`)
    .replace(/<td(?: [^>]*)?>/g, `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top">`)
    .replace(/<th(?: [^>]*)?>/g, `<th align="left" style="padding:6px 8px;border-bottom:2px solid ${B.ink};font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280">`)
    .replace(/<a (?![^>]*style=)/g, `<a style="color:${B.link};text-decoration:underline;text-underline-offset:3px" `);
}

export function emailShell(o: EmailShell): string {
  const links = (o.footerLinks ?? []).map((l) => `<a href="${l.href}" style="color:#6b7280;text-decoration:underline">${l.label}</a>`).join(" &nbsp;·&nbsp; ");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"><title>${esc(o.title ?? SITE.name)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:${FONT};color:${B.ink};-webkit-font-smoothing:antialiased">
${o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3f4f6">${esc(o.preheader)}${"&nbsp;&zwnj;".repeat(40)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e5e7eb">
  <tr><td style="padding:22px 32px 16px;border-bottom:2px solid ${B.ink}">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;padding-right:10px"><a href="${SITE.url}" style="text-decoration:none"><img src="${SITE.url}/icon-192.png" width="28" height="28" alt="" style="display:block;border:0;width:28px;height:28px"></a></td>
      <td style="vertical-align:middle"><a href="${SITE.url}" style="font-family:${FONT};font-size:22px;font-weight:600;letter-spacing:-0.02em;color:${B.ink};text-decoration:none">searchable<span style="color:${B.primary}">.pk</span></a></td>
      ${o.kicker ? `<td style="vertical-align:middle;padding-left:12px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#6b7280">${esc(o.kicker)}</td>` : ""}
    </tr></table>
  </td></tr>
  <tr><td style="padding:26px 32px 8px">
    ${o.title ? `<h1 style="font-family:${FONT};font-size:24px;line-height:1.25;letter-spacing:-0.01em;margin:0 0 16px;color:${B.ink}">${esc(o.title)}</h1>` : ""}
    ${styleContent(o.body)}
    ${o.cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 8px"><tr><td style="background:${B.primary}"><a href="${o.cta.href}" style="display:inline-block;padding:12px 20px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">${esc(o.cta.label)}</a></td></tr></table>` : ""}
  </td></tr>
  <tr><td style="padding:16px 32px 22px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.7;color:#6b7280">
    ${o.footerNote ? `${esc(o.footerNote)}<br>` : ""}
    ${links || `Sent by ${esc(SITE.name)} to an address linked to an action on ${esc(HOST)}. Reply to this email to reach us.`}<br>
    <span style="color:#9ca3af">${esc(SITE.name)} · Lahore, Pakistan · <a href="${SITE.url}" style="color:#9ca3af;text-decoration:none">${esc(HOST)}</a></span>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

/** True when a template already ships a full document (the newsletter), so `sendEmail()` must not wrap it again. */
export const isFullDocument = (html: string) => /^\s*<!doctype|^\s*<html/i.test(html);

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
