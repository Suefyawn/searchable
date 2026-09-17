import { NextResponse, type NextRequest } from "next/server";

/*
 * Markdown negotiation for agents: a request for an article, guide, tool or data page that prefers
 * text/markdown (Accept header) is served the markdown rendition the page already advertises as its
 * alternate, at the same URL; the home page answers with the llms.txt map. Browsers never send that Accept
 * value, so readers are untouched. The matcher keeps this off every other path so it costs nothing elsewhere.
 */
export function proxy(req: NextRequest) {
  const accept = req.headers.get("accept") ?? "";
  if (!/text\/markdown/i.test(accept) || /text\/html/i.test(accept.split(",")[0] ?? "")) {
    // Both renditions live at one URL, so any shared cache in front must key on Accept for the HTML too.
    const pass = NextResponse.next();
    pass.headers.set("vary", "Accept");
    return pass;
  }
  const url = req.nextUrl.clone();
  url.pathname = url.pathname === "/" ? "/api/md/home" : `/api/md${url.pathname}`;
  const res = NextResponse.rewrite(url);
  res.headers.set("vary", "Accept");
  return res;
}

export const config = {
  matcher: ["/", "/news", "/news/:category", "/news/:category/:slug", "/guides", "/guides/:category", "/guides/:category/:slug", "/tools", "/tools/:category", "/tools/:category/:slug", "/data", "/data/:slug"],
};
