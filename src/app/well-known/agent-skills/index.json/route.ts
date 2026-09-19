import { createHash } from "node:crypto";
import { SKILL_MD } from "@/lib/skill";
import { SITE } from "@/lib/utils";

export const revalidate = 86400;

/** Agent Skills Discovery index (v0.2.0): one skill, the SKILL.md that teaches an agent our API. */
export function GET() {
  const digest = "sha256:" + createHash("sha256").update(SKILL_MD).digest("hex");
  const body = {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: [{ name: "searchable-pk", type: "skill-md", description: "Look up Pakistan prices and rates, run Pakistani tax, bill and finance calculators, and fetch Searchable.pk pages as markdown to cite.", url: `${SITE.url}/skills/searchable-pk/SKILL.md`, digest }],
  };
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
