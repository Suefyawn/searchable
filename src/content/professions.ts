/**
 * Professions people search for by name and city. Each has the licence body whose number we ask for
 * (shown on the profile and checked at verification) and the words a profile is found by.
 */
export type ProfessionGroup = "health" | "trades" | "engineering" | "design" | "legal" | "finance" | "education" | "tech" | "creative" | "property" | "other";

export type Profession = {
  slug: string;
  name: string;
  plural: string;
  group: ProfessionGroup;
  /** Licence or registration body, if the profession has one. */
  licence?: { body: string; label: string; url?: string };
  keywords: string[];
};

export const PROFESSION_GROUPS: Record<ProfessionGroup, string> = {
  health: "Health",
  trades: "Home and trades",
  engineering: "Engineering",
  design: "Architecture and design",
  legal: "Legal",
  finance: "Finance and tax",
  education: "Education",
  tech: "Technology",
  creative: "Creative and media",
  property: "Property",
  other: "Other",
};

export const PROFESSIONS: Profession[] = [
  { slug: "doctor", name: "Doctor", plural: "Doctors", group: "health", licence: { body: "PMDC", label: "PMDC registration no.", url: "https://pmdc.pk" }, keywords: ["physician", "consultant", "specialist", "clinic", "MBBS"] },
  { slug: "dentist", name: "Dentist", plural: "Dentists", group: "health", licence: { body: "PMDC", label: "PMDC registration no." }, keywords: ["dental surgeon", "BDS", "orthodontist"] },
  { slug: "physiotherapist", name: "Physiotherapist", plural: "Physiotherapists", group: "health", keywords: ["physio", "rehab", "DPT"] },
  { slug: "psychologist", name: "Psychologist", plural: "Psychologists", group: "health", keywords: ["therapist", "counsellor", "mental health"] },
  { slug: "nutritionist", name: "Nutritionist", plural: "Nutritionists", group: "health", keywords: ["dietitian", "diet plan"] },
  { slug: "nurse", name: "Nurse", plural: "Nurses", group: "health", licence: { body: "PNC", label: "PNC registration no." }, keywords: ["home nursing", "caregiver"] },
  { slug: "electrician", name: "Electrician", plural: "Electricians", group: "trades", keywords: ["wiring", "bijli", "electric work", "UPS installation"] },
  { slug: "plumber", name: "Plumber", plural: "Plumbers", group: "trades", keywords: ["sanitary", "pipe", "water"] },
  { slug: "ac-technician", name: "AC technician", plural: "AC technicians", group: "trades", keywords: ["air conditioner", "AC service", "AC repair", "HVAC"] },
  { slug: "solar-installer", name: "Solar installer", plural: "Solar installers", group: "trades", keywords: ["solar panels", "net metering", "inverter"] },
  { slug: "carpenter", name: "Carpenter", plural: "Carpenters", group: "trades", keywords: ["woodwork", "furniture", "kitchen"] },
  { slug: "painter", name: "Painter", plural: "Painters", group: "trades", keywords: ["house painting", "polish"] },
  { slug: "mason", name: "Mason", plural: "Masons", group: "trades", keywords: ["construction", "tiles", "mistri"] },
  { slug: "car-mechanic", name: "Car mechanic", plural: "Car mechanics", group: "trades", keywords: ["mechanic", "workshop", "car repair"] },
  { slug: "civil-engineer", name: "Civil engineer", plural: "Civil engineers", group: "engineering", licence: { body: "PEC", label: "PEC registration no.", url: "https://www.pec.org.pk" }, keywords: ["structural", "construction", "site engineer"] },
  { slug: "electrical-engineer", name: "Electrical engineer", plural: "Electrical engineers", group: "engineering", licence: { body: "PEC", label: "PEC registration no." }, keywords: ["power", "MEP"] },
  { slug: "mechanical-engineer", name: "Mechanical engineer", plural: "Mechanical engineers", group: "engineering", licence: { body: "PEC", label: "PEC registration no." }, keywords: ["HVAC", "plant", "maintenance"] },
  { slug: "software-engineer", name: "Software engineer", plural: "Software engineers", group: "tech", keywords: ["developer", "programmer", "web developer", "app developer"] },
  { slug: "architect", name: "Architect", plural: "Architects", group: "design", licence: { body: "PCATP", label: "PCATP registration no.", url: "https://pcatp.org.pk" }, keywords: ["house design", "building design", "town planner"] },
  { slug: "interior-designer", name: "Interior designer", plural: "Interior designers", group: "design", keywords: ["interior", "decor", "renovation"] },
  { slug: "graphic-designer", name: "Graphic designer", plural: "Graphic designers", group: "creative", keywords: ["logo", "branding", "UI designer"] },
  { slug: "photographer", name: "Photographer", plural: "Photographers", group: "creative", keywords: ["wedding photographer", "videographer", "shoot"] },
  { slug: "content-writer", name: "Content writer", plural: "Content writers", group: "creative", keywords: ["copywriter", "SEO writer", "blogger"] },
  { slug: "lawyer", name: "Lawyer", plural: "Lawyers", group: "legal", licence: { body: "Bar Council", label: "Bar Council enrolment no." }, keywords: ["advocate", "attorney", "legal advisor", "vakeel"] },
  { slug: "chartered-accountant", name: "Chartered accountant", plural: "Chartered accountants", group: "finance", licence: { body: "ICAP", label: "ICAP membership no.", url: "https://www.icap.org.pk" }, keywords: ["CA", "audit", "accounts"] },
  { slug: "tax-consultant", name: "Tax consultant", plural: "Tax consultants", group: "finance", keywords: ["income tax return", "FBR", "filer", "sales tax"] },
  { slug: "financial-advisor", name: "Financial advisor", plural: "Financial advisors", group: "finance", keywords: ["investment", "insurance", "wealth"] },
  { slug: "teacher", name: "Teacher", plural: "Teachers", group: "education", keywords: ["tutor", "home tuition", "O level", "A level", "matric"] },
  { slug: "quran-teacher", name: "Quran teacher", plural: "Quran teachers", group: "education", keywords: ["Qari", "tajweed", "hifz", "online Quran"] },
  { slug: "it-consultant", name: "IT consultant", plural: "IT consultants", group: "tech", keywords: ["network", "IT support", "systems"] },
  { slug: "digital-marketer", name: "Digital marketer", plural: "Digital marketers", group: "tech", keywords: ["SEO", "social media", "ads", "marketing"] },
  { slug: "property-agent", name: "Property agent", plural: "Property agents", group: "property", keywords: ["real estate", "estate agent", "dealer", "plot", "rent"] },
  { slug: "property-valuer", name: "Property valuer", plural: "Property valuers", group: "property", keywords: ["valuation", "surveyor"] },
  { slug: "event-planner", name: "Event planner", plural: "Event planners", group: "other", keywords: ["wedding planner", "events", "decor"] },
  { slug: "driver", name: "Driver", plural: "Drivers", group: "other", keywords: ["personal driver", "chauffeur"] },
  { slug: "makeup-artist", name: "Makeup artist", plural: "Makeup artists", group: "other", keywords: ["bridal makeup", "salon", "beautician"] },
];

export const PROFESSION_BY_SLUG = new Map(PROFESSIONS.map((p) => [p.slug, p]));
export function getProfession(slug: string): Profession | undefined {
  return PROFESSION_BY_SLUG.get(slug);
}
export function professionsInGroup(group: ProfessionGroup): Profession[] {
  return PROFESSIONS.filter((p) => p.group === group);
}
