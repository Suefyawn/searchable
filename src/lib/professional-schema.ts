import { z } from "zod";
import { PROFESSIONS } from "@/content/professions";

const Experience = z.object({ title: z.string().trim().min(1).max(120), org: z.string().trim().max(120).optional(), from: z.string().trim().max(10).optional(), to: z.string().trim().max(10).optional(), description: z.string().trim().max(400).optional() });
const Education = z.object({ degree: z.string().trim().min(1).max(120), institution: z.string().trim().max(120).optional(), year: z.string().trim().max(10).optional() });
const Certification = z.object({ name: z.string().trim().min(1).max(120), issuer: z.string().trim().max(120).optional(), year: z.string().trim().max(10).optional(), number: z.string().trim().max(60).optional() });
const Service = z.object({ name: z.string().trim().min(1).max(120), priceFrom: z.number().int().nonnegative().optional(), unit: z.string().trim().max(30).optional() });
const handle = z.string().trim().max(200).optional();

export const ProfessionalInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  professionSlug: z.string().refine((s) => PROFESSIONS.some((p) => p.slug === s), "Pick a profession"),
  headline: z.string().trim().max(160).optional(),
  bio: z.string().trim().max(4000).optional(),
  cityId: z.string().optional(),
  areaId: z.string().optional(),
  workplace: z.string().trim().max(200).optional(),
  serviceMode: z.enum(["in_person", "online", "both"]).optional(),
  phone: z.string().trim().max(20).optional(),
  whatsapp: z.string().trim().max(20).optional(),
  email: z.string().trim().max(120).optional(),
  showEmail: z.boolean().default(false),
  website: z.string().trim().max(200).optional(),
  linkedin: handle,
  x: handle,
  instagram: handle,
  facebook: handle,
  github: handle,
  youtube: handle,
  tiktok: handle,
  behance: handle,
  languages: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  services: z.array(Service).max(20).default([]),
  experience: z.array(Experience).max(15).default([]),
  education: z.array(Education).max(10).default([]),
  certifications: z.array(Certification).max(15).default([]),
  yearsExperience: z.number().int().min(0).max(70).optional(),
  licenceNo: z.string().trim().max(60).optional(),
  availability: z.string().trim().max(160).optional(),
  rateFrom: z.number().int().nonnegative().optional(),
  rateUnit: z.string().trim().max(30).optional(),
  cvUrl: z.string().trim().max(500).optional(),
  cvPublic: z.boolean().default(true),
  photoUrl: z.string().trim().max(500).optional(),
});
export type ProfessionalFormInput = z.infer<typeof ProfessionalInput>;
