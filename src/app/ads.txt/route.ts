/** AdSense authorised-seller file. Populated from env so staging never claims the publisher id. */
export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.replace(/^ca-/, "");
  const body = client ? `google.com, ${client}, DIRECT, f08c47fec0942fa0\n` : "# No advertising publisher configured\n";
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" } });
}
