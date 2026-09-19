/**
 * @jet/email (ADR-49): the provider seam. A site keeps its own budget, templates and tables; this package only
 * knows how to hand one message to one provider. Swapping Resend for another sender is a new provider here.
 */
export type Message = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Extra RFC headers such as In-Reply-To and References so replies thread in the recipient's client. */
  headers?: Record<string, string>;
};

export type Provider = { name: string; send(message: Message): Promise<{ id: string }> };

type Fetch = typeof fetch;

/** Resend over its REST API: one endpoint, no SDK. `fetchImpl` is injectable for tests. */
export function resendProvider(apiKey: string, fetchImpl: Fetch = fetch): Provider {
  return {
    name: "resend",
    async send(m) {
      const res = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from: m.from, to: Array.isArray(m.to) ? m.to : [m.to], subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo, headers: m.headers }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
      if (!res.ok) throw new Error(`resend ${res.status}${body.name ? ` ${body.name}` : ""}: ${body.message ?? "send failed"}`);
      return { id: body.id ?? "" };
    },
  };
}

/** Logs the envelope and returns a fake id; for development and for environments fenced from sending. */
export function consoleProvider(label = "email", log: (line: string) => void = console.info): Provider {
  return {
    name: label,
    async send(m) {
      const id = `${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      log(`[${label}] ${m.subject} -> ${Array.isArray(m.to) ? m.to.join(", ") : m.to} (${id})`);
      return { id };
    },
  };
}
