import type { Metadata } from "next";
import { SITE } from "./utils";

type MetaInput = {
  title: string;
  description?: string | null;
  path: string;
  image?: string | null;
  type?: "website" | "article" | "profile";
  publishedTime?: Date | null;
  modifiedTime?: Date | null;
  noindex?: boolean;
  /** Skip the " · Searchable" suffix (home page). */
  absoluteTitle?: boolean;
  /** Small label on the generated social card (category, section). */
  kicker?: string;
  /** Path of a Markdown rendition (/api/md/...) for text-first crawlers and language models. */
  markdownPath?: string;
};

export function ogImageUrl(title: string, kicker?: string) {
  const p = new URLSearchParams({ title });
  if (kicker) p.set("kicker", kicker);
  return `${SITE.url}/og?${p.toString()}`;
}

export function buildMetadata(input: MetaInput): Metadata {
  const url = `${SITE.url}${input.path}`;
  // The root layout applies the "%s · Searchable" template; social cards get the full string.
  const title = input.absoluteTitle ? input.title : `${input.title} · ${SITE.name}`;
  const description = input.description ?? SITE.description;
  const image = input.image ?? ogImageUrl(input.title, input.kicker);
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description,
    alternates: { canonical: url, ...(input.markdownPath ? { types: { "text/markdown": `${SITE.url}${input.markdownPath}` } } : {}) },
    // Large previews unlock Google Discover; unlimited snippets let search and AI engines quote the page.
    robots: input.noindex ? { index: false, follow: true } : { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      type: input.type ?? "website",
      locale: "en_PK",
      images: [{ url: image }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime.toISOString() } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime.toISOString() } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: [image], site: SITE.twitter },
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...crumbs].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE.url}${c.path}`,
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/icon.svg`,
    sameAs: [`https://twitter.com/${SITE.twitter.replace("@", "")}`],
    contactPoint: { "@type": "ContactPoint", contactType: "editorial", email: "editorial@searchable.pk" },
    knowsAbout: ["Pakistan taxes", "electricity tariffs", "solar energy", "car prices", "property tax", "exchange rates", "gold prices", "business directory"],
  };
}

export function personJsonLd(a: { name: string; slug: string; bio?: string | null }) {
  return { "@context": "https://schema.org", "@type": "Person", name: a.name, url: `${SITE.url}/authors/${a.slug}`, description: a.bio ?? undefined, worksFor: { "@type": "Organization", name: SITE.name, url: SITE.url } };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function articleJsonLd(a: {
  kind: "news" | "guide" | "explainer" | "page";
  title: string;
  description: string;
  path: string;
  image?: string | null;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
  authorName?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": a.kind === "news" ? "NewsArticle" : "Article",
    headline: a.title,
    description: a.description,
    mainEntityOfPage: `${SITE.url}${a.path}`,
    image: a.image ? [a.image] : undefined,
    datePublished: a.publishedAt?.toISOString(),
    dateModified: (a.updatedAt ?? a.publishedAt)?.toISOString(),
    author: { "@type": a.authorName ? "Person" : "Organization", name: a.authorName ?? SITE.name },
    publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: `${SITE.url}/icon.svg` } },
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
}

export function toolJsonLd(t: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t.name,
    description: t.description,
    url: `${SITE.url}${t.path}`,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "PKR" },
    publisher: { "@type": "Organization", name: SITE.name },
  };
}

export function localBusinessJsonLd(b: {
  name: string;
  description?: string | null;
  path: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  image?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
  priceRange?: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: b.name,
    description: b.description ?? undefined,
    url: `${SITE.url}${b.path}`,
    telephone: b.phone ?? undefined,
    image: b.image ?? undefined,
    priceRange: b.priceRange ? "₨".repeat(b.priceRange) : undefined,
    address: b.address || b.city ? { "@type": "PostalAddress", streetAddress: b.address ?? undefined, addressLocality: b.city ?? undefined, addressCountry: "PK" } : undefined,
    geo: b.lat && b.lng ? { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng } : undefined,
    aggregateRating: b.ratingCount && b.ratingCount > 0 ? { "@type": "AggregateRating", ratingValue: b.ratingAvg, reviewCount: b.ratingCount } : undefined,
  };
}
