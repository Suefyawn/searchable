import { SKILL_MD } from "@/lib/skill";

export const revalidate = 86400;

export function GET() {
  return new Response(SKILL_MD, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
