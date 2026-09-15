import type { MetadataRoute } from "next";
import { SITE } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api/", "/search", "/login", "/newsletter/confirm", "/newsletter/unsubscribe"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
