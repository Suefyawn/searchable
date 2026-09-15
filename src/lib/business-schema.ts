import { z } from "zod";

const Hours = z.object({ dayOfWeek: z.number().int().min(0).max(6), opens: z.string().regex(/^\d{2}:\d{2}$/).nullable(), closes: z.string().regex(/^\d{2}:\d{2}$/).nullable(), isClosed: z.boolean() });
const Service = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(300).optional(), priceFrom: z.number().int().nonnegative().optional() });

export const BusinessInput = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(160).optional(),
  description: z.string().trim().max(3000).optional(),
  primaryCategoryId: z.string().optional(),
  cityId: z.string().optional(),
  areaId: z.string().optional(),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(20).optional(),
  whatsapp: z.string().trim().max(20).optional(),
  email: z.string().trim().max(120).optional(),
  website: z.string().trim().max(200).optional(),
  facebook: z.string().trim().max(200).optional(),
  instagram: z.string().trim().max(200).optional(),
  priceRange: z.number().int().min(0).max(4).optional(),
  logoUrl: z.string().trim().max(500).optional(),
  coverUrl: z.string().trim().max(500).optional(),
  hours: z.array(Hours).max(7).default([]),
  services: z.array(Service).max(40).default([]),
});
export type BusinessFormInput = z.infer<typeof BusinessInput>;
