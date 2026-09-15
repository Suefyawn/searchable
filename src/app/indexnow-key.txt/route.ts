/** IndexNow key file: engines fetch this URL to verify the key sent in pings (see src/lib/indexnow.ts). */
export function GET() {
  const key = process.env.INDEXNOW_KEY;
  return new Response(key ?? "", { status: key ? 200 : 404, headers: { "content-type": "text/plain; charset=utf-8" } });
}
