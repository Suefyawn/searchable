/**
 * Electricity distribution companies. Powers /electricity and /electricity/[slug]
 * ("lesco bill check", "iesco bill", "mepco bill" — among the highest-volume queries in Pakistan).
 * Bill portals are the official PITC/company portals; verify links quarterly.
 */
export type Disco = {
  slug: string;
  short: string;
  name: string;
  region: string;
  cities: string[];
  billUrl: string;
  billUrlLabel: string;
  helpline: string;
  website?: string;
  notes?: string;
};

export const DISCOS: Disco[] = [
  { slug: "lesco", short: "LESCO", name: "Lahore Electric Supply Company", region: "Central Punjab", cities: ["Lahore", "Kasur", "Okara", "Sheikhupura", "Nankana Sahib"], billUrl: "https://bill.lesco.gov.pk/", billUrlLabel: "bill.lesco.gov.pk", helpline: "118", website: "https://www.lesco.gov.pk" },
  { slug: "iesco", short: "IESCO", name: "Islamabad Electric Supply Company", region: "Islamabad & north Punjab", cities: ["Islamabad", "Rawalpindi", "Attock", "Jhelum", "Chakwal"], billUrl: "https://bill.pitc.com.pk/iescobill", billUrlLabel: "bill.pitc.com.pk/iescobill", helpline: "118", website: "https://www.iesco.com.pk" },
  { slug: "mepco", short: "MEPCO", name: "Multan Electric Power Company", region: "South Punjab", cities: ["Multan", "Bahawalpur", "Dera Ghazi Khan", "Sahiwal", "Vehari", "Rahim Yar Khan", "Muzaffargarh", "Khanewal", "Lodhran", "Bahawalnagar", "Layyah", "Rajanpur", "Pakpattan"], billUrl: "https://bill.pitc.com.pk/mepcobill", billUrlLabel: "bill.pitc.com.pk/mepcobill", helpline: "118", website: "https://www.mepco.com.pk" },
  { slug: "gepco", short: "GEPCO", name: "Gujranwala Electric Power Company", region: "North-central Punjab", cities: ["Gujranwala", "Sialkot", "Gujrat", "Narowal", "Hafizabad", "Mandi Bahauddin"], billUrl: "https://bill.pitc.com.pk/gepcobill", billUrlLabel: "bill.pitc.com.pk/gepcobill", helpline: "118", website: "https://www.gepco.com.pk" },
  { slug: "fesco", short: "FESCO", name: "Faisalabad Electric Supply Company", region: "West-central Punjab", cities: ["Faisalabad", "Jhang", "Sargodha", "Mianwali", "Bhakkar", "Toba Tek Singh", "Chiniot", "Khushab"], billUrl: "https://bill.pitc.com.pk/fescobill", billUrlLabel: "bill.pitc.com.pk/fescobill", helpline: "118", website: "https://www.fesco.com.pk" },
  { slug: "pesco", short: "PESCO", name: "Peshawar Electric Supply Company", region: "Khyber Pakhtunkhwa", cities: ["Peshawar", "Mardan", "Abbottabad", "Swat", "Bannu", "Kohat", "Hazara"], billUrl: "https://bill.pitc.com.pk/pescobill", billUrlLabel: "bill.pitc.com.pk/pescobill", helpline: "118", website: "https://www.pesco.gov.pk" },
  { slug: "hesco", short: "HESCO", name: "Hyderabad Electric Supply Company", region: "Lower Sindh (outside Karachi)", cities: ["Hyderabad", "Mirpurkhas", "Nawabshah", "Badin", "Thatta", "Tando Allahyar"], billUrl: "https://bill.pitc.com.pk/hescobill", billUrlLabel: "bill.pitc.com.pk/hescobill", helpline: "118", website: "https://www.hesco.gov.pk" },
  { slug: "sepco", short: "SEPCO", name: "Sukkur Electric Power Company", region: "Upper Sindh", cities: ["Sukkur", "Larkana", "Khairpur", "Jacobabad", "Shikarpur", "Ghotki", "Dadu"], billUrl: "https://bill.pitc.com.pk/sepcobill", billUrlLabel: "bill.pitc.com.pk/sepcobill", helpline: "118", website: "https://www.sepco.com.pk" },
  { slug: "qesco", short: "QESCO", name: "Quetta Electric Supply Company", region: "Balochistan", cities: ["Quetta", "Khuzdar", "Loralai", "Sibi", "Gwadar", "Turbat"], billUrl: "https://bill.pitc.com.pk/qescobill", billUrlLabel: "bill.pitc.com.pk/qescobill", helpline: "118", website: "https://www.qesco.com.pk" },
  { slug: "tesco", short: "TESCO", name: "Tribal Electric Supply Company", region: "Merged tribal districts, KP", cities: ["Khyber", "Kurram", "Bajaur", "Mohmand", "Orakzai", "North Waziristan", "South Waziristan"], billUrl: "https://bill.pitc.com.pk/tescobill", billUrlLabel: "bill.pitc.com.pk/tescobill", helpline: "118" },
  { slug: "k-electric", short: "K-Electric", name: "K-Electric Limited", region: "Karachi and surroundings", cities: ["Karachi", "Dhabeji", "Gharo", "Hub (Balochistan)"], billUrl: "https://www.ke.com.pk/customer-services/", billUrlLabel: "ke.com.pk (KE Live app)", helpline: "118", website: "https://www.ke.com.pk", notes: "K-Electric is the only privately owned, vertically integrated utility; its tariff is set separately by NEPRA but tracks the national uniform tariff." },
];

export function getDisco(slug: string) {
  return DISCOS.find((d) => d.slug === slug);
}
