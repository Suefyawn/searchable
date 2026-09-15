import { SITE } from "./utils";

/**
 * IndexNow: tell Bing, Yandex, Seznam, Naver and Yep about new or changed URLs the moment they publish.
 * Set INDEXNOW_KEY (any 32-char hex string); it is served at /indexnow-key.txt.
 * Silent no-op locally or when unset; Google does not support IndexNow and is covered by the news sitemap.
 */
export async function pingIndexNow(paths: string[]): Promise<{ sent: number }> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || !paths.length || !/^https:\/\//.test(SITE.url)) return { sent: 0 };
  const host = new URL(SITE.url).host;
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: `${SITE.url}/indexnow-key.txt`, urlList: paths.map((p) => `${SITE.url}${p}`) }),
    });
    return { sent: paths.length };
  } catch {
    return { sent: 0 };
  }
}
