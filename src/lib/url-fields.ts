import { z } from "zod";

/** A link someone typed: http(s) only. "example.com" gets https:// in front; "javascript:" is refused. */
export const webUrl = z
  .string()
  .trim()
  .max(300)
  .transform((u) => (u && !/^[a-z][a-z0-9+.-]*:/i.test(u) ? `https://${u}` : u))
  .refine((u) => !u || /^https?:\/\/\S+$/i.test(u), "Enter a link that starts with https://");

/** The URL of a file uploaded through /api/upload: root-relative locally, the CDN host in production. */
export const assetUrl = z
  .string()
  .trim()
  .max(500)
  .refine((u) => !u || /^(https?:\/\/\S+|\/(?!\/)\S*)$/i.test(u), "Not a file URL");
