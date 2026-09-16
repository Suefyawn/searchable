import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { preconnect } from "react-dom";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { AdSenseScript } from "@/components/ads";
import { ClarityScript } from "@/components/clarity";
import { JsonLd } from "@/components/ui";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { brandCss, readSiteSettings } from "@/lib/site-settings";
import { SITE } from "@/lib/utils";
import "./globals.css";

// One family for everything (ADR-33): Geist at 400 and 500 for text, 600 with tight tracking for headlines.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { siteName: SITE.name, type: "website", locale: "en_PK" },
  twitter: { card: "summary_large_image", site: SITE.twitter },
  robots: { index: true, follow: true },
  // Search Console and Bing Webmaster ownership without touching DNS: paste the token they show into the env var.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION?.trim() || undefined,
    other: process.env.BING_SITE_VERIFICATION?.trim() ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION.trim() } : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfdfc" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
  width: "device-width",
  initialScale: 1,
};

/** Where uploads are served from; the fallback script only retries images from this host. */
const imageHost = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // DNS, TCP and TLS to the image host are set up while the HTML is still arriving: a page's first photo
  // saves a round trip (a few hundred milliseconds from Pakistan).
  if (imageHost) preconnect(imageHost);
  const settings = await readSiteSettings();
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-dvh flex flex-col">
        {/* The brand kit from /admin/settings: five tokens every colour in globals.css derives from. Hoisted
            into <head> after the stylesheet, so a change here needs no deployment. */}
        <style precedence="brand" href="brand-tokens">{brandCss(settings.brand)}</style>
        {/* If the image host is unreachable for a visitor (an extension, a per-site setting, an ISP), the same
            file is retried through this domain at /media/, which proxies the image CDN. Runs before any image. */}
        {imageHost ? <script dangerouslySetInnerHTML={{ __html: `(function(h){window.addEventListener('error',function(e){var t=e.target;if(!t||t.tagName!=='IMG')return;var s=t.currentSrc||t.src||'';if(s.indexOf(h)!==0||t.dataset.retried===s)return;t.dataset.retried=s;t.removeAttribute('srcset');t.src='/media'+s.slice(h.length);},true);})(${JSON.stringify(imageHost)})` }} /> : null}
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <AdSenseScript />
        <ClarityScript />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-ink-900 focus:px-3 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
