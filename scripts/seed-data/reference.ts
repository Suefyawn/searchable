/**
 * Reference data: geography, categories, entities. Safe to seed in production (SEED_MODE=reference).
 */

export type CityDef = { slug: string; name: string; nameUrdu?: string; province: string; lat: number; lng: number; population: number; areas?: { slug: string; name: string }[] };

export const PROVINCES = [
  { slug: "punjab", name: "Punjab", nameUrdu: "پنجاب", sortOrder: 1 },
  { slug: "sindh", name: "Sindh", nameUrdu: "سندھ", sortOrder: 2 },
  { slug: "khyber-pakhtunkhwa", name: "Khyber Pakhtunkhwa", nameUrdu: "خیبر پختونخوا", sortOrder: 3 },
  { slug: "balochistan", name: "Balochistan", nameUrdu: "بلوچستان", sortOrder: 4 },
  { slug: "islamabad-capital-territory", name: "Islamabad Capital Territory", nameUrdu: "وفاقی دارالحکومت", sortOrder: 5 },
  { slug: "azad-kashmir", name: "Azad Jammu & Kashmir", nameUrdu: "آزاد کشمیر", sortOrder: 6 },
  { slug: "gilgit-baltistan", name: "Gilgit-Baltistan", nameUrdu: "گلگت بلتستان", sortOrder: 7 },
];

export const CITIES: CityDef[] = [
  {
    slug: "karachi", name: "Karachi", nameUrdu: "کراچی", province: "sindh", lat: 24.8607, lng: 67.0011, population: 20_382_881,
    areas: [
      { slug: "clifton", name: "Clifton" }, { slug: "dha-karachi", name: "DHA" }, { slug: "gulshan-e-iqbal", name: "Gulshan-e-Iqbal" },
      { slug: "saddar", name: "Saddar" }, { slug: "north-nazimabad", name: "North Nazimabad" }, { slug: "bahadurabad", name: "Bahadurabad" },
      { slug: "gulistan-e-johar", name: "Gulistan-e-Johar" }, { slug: "malir", name: "Malir" },
    ],
  },
  {
    slug: "lahore", name: "Lahore", nameUrdu: "لاہور", province: "punjab", lat: 31.5204, lng: 74.3587, population: 13_004_135,
    areas: [
      { slug: "dha-lahore", name: "DHA" }, { slug: "gulberg", name: "Gulberg" }, { slug: "johar-town", name: "Johar Town" },
      { slug: "model-town", name: "Model Town" }, { slug: "bahria-town-lahore", name: "Bahria Town" }, { slug: "cantt", name: "Cantt" },
      { slug: "wapda-town", name: "WAPDA Town" }, { slug: "allama-iqbal-town", name: "Allama Iqbal Town" }, { slug: "mall-road", name: "Mall Road" },
    ],
  },
  {
    slug: "islamabad", name: "Islamabad", nameUrdu: "اسلام آباد", province: "islamabad-capital-territory", lat: 33.6844, lng: 73.0479, population: 1_108_872,
    areas: [
      { slug: "f-6", name: "F-6" }, { slug: "f-7", name: "F-7" }, { slug: "f-10", name: "F-10" }, { slug: "f-11", name: "F-11" },
      { slug: "blue-area", name: "Blue Area" }, { slug: "g-9", name: "G-9" }, { slug: "g-11", name: "G-11" }, { slug: "i-8", name: "I-8" },
      { slug: "bahria-town-islamabad", name: "Bahria Town" }, { slug: "dha-islamabad", name: "DHA" },
    ],
  },
  { slug: "rawalpindi", name: "Rawalpindi", nameUrdu: "راولپنڈی", province: "punjab", lat: 33.5651, lng: 73.0169, population: 2_098_231, areas: [{ slug: "saddar-rawalpindi", name: "Saddar" }, { slug: "satellite-town", name: "Satellite Town" }, { slug: "bahria-town-rawalpindi", name: "Bahria Town" }] },
  { slug: "faisalabad", name: "Faisalabad", nameUrdu: "فیصل آباد", province: "punjab", lat: 31.4504, lng: 73.135, population: 3_203_846 },
  { slug: "multan", name: "Multan", nameUrdu: "ملتان", province: "punjab", lat: 30.1575, lng: 71.5249, population: 1_871_843 },
  { slug: "gujranwala", name: "Gujranwala", nameUrdu: "گوجرانوالہ", province: "punjab", lat: 32.1877, lng: 74.1945, population: 2_027_001 },
  { slug: "sialkot", name: "Sialkot", nameUrdu: "سیالکوٹ", province: "punjab", lat: 32.4945, lng: 74.5229, population: 655_852 },
  { slug: "bahawalpur", name: "Bahawalpur", nameUrdu: "بہاولپور", province: "punjab", lat: 29.3956, lng: 71.6836, population: 762_111 },
  { slug: "sargodha", name: "Sargodha", nameUrdu: "سرگودھا", province: "punjab", lat: 32.0836, lng: 72.6711, population: 659_862 },
  { slug: "hyderabad", name: "Hyderabad", nameUrdu: "حیدرآباد", province: "sindh", lat: 25.396, lng: 68.3578, population: 1_732_693 },
  { slug: "sukkur", name: "Sukkur", nameUrdu: "سکھر", province: "sindh", lat: 27.7052, lng: 68.8574, population: 499_900 },
  { slug: "peshawar", name: "Peshawar", nameUrdu: "پشاور", province: "khyber-pakhtunkhwa", lat: 34.0151, lng: 71.5249, population: 1_970_042, areas: [{ slug: "hayatabad", name: "Hayatabad" }, { slug: "university-town", name: "University Town" }] },
  { slug: "abbottabad", name: "Abbottabad", nameUrdu: "ایبٹ آباد", province: "khyber-pakhtunkhwa", lat: 34.1688, lng: 73.2215, population: 208_000 },
  { slug: "mardan", name: "Mardan", nameUrdu: "مردان", province: "khyber-pakhtunkhwa", lat: 34.1989, lng: 72.0231, population: 358_604 },
  { slug: "quetta", name: "Quetta", nameUrdu: "کوئٹہ", province: "balochistan", lat: 30.1798, lng: 66.975, population: 1_001_205 },
  { slug: "gwadar", name: "Gwadar", nameUrdu: "گوادر", province: "balochistan", lat: 25.1264, lng: 62.3225, population: 90_762 },
  { slug: "muzaffarabad", name: "Muzaffarabad", nameUrdu: "مظفرآباد", province: "azad-kashmir", lat: 34.37, lng: 73.4711, population: 150_000 },
  { slug: "gilgit", name: "Gilgit", nameUrdu: "گلگت", province: "gilgit-baltistan", lat: 35.9208, lng: 74.3089, population: 216_760 },
  { slug: "skardu", name: "Skardu", nameUrdu: "سکردو", province: "gilgit-baltistan", lat: 35.2971, lng: 75.6333, population: 26_023 },
];

export const NEWS_CATEGORIES = [
  ["pakistan", "Pakistan", "National news and what it means for you"],
  ["politics", "Politics", "Government, parliament, courts and policy"],
  ["business", "Business", "Companies, markets, trade and startups"],
  ["economy", "Economy", "Inflation, rupee, rates, budget and data"],
  ["technology", "Technology", "Telecom, internet, gadgets and digital Pakistan"],
  ["ai", "AI", "Artificial intelligence in Pakistan and beyond"],
  ["science", "Science", "Research, space, climate and environment"],
  ["sports", "Sports", "Cricket, football, hockey and more"],
  ["education", "Education", "Schools, boards, HEC, universities and scholarships"],
  ["health", "Health", "Public health, hospitals and medicine"],
  ["auto", "Auto", "Cars, bikes, prices and policy"],
  ["property", "Property", "Real estate, housing societies and taxes"],
  ["lifestyle", "Lifestyle", "Food, travel, culture and living"],
  ["world", "World", "International news with a Pakistan angle"],
] as const;

export const GUIDE_CATEGORIES = [
  ["taxes", "Taxes", "Filing, NTN, FBR, withholding and refunds"],
  ["banking", "Banking", "Accounts, cards, loans, remittances"],
  ["cars", "Cars", "Buying, registration, transfer, import"],
  ["property", "Property", "Buying, selling, transfer, taxes"],
  ["government", "Government", "NADRA, passports, licences, certificates"],
  ["utilities", "Utilities", "Electricity, gas, water connections and bills"],
  ["telecom", "Telecom", "SIMs, PTA, packages, complaints"],
  ["education", "Education", "Admissions, scholarships, equivalence"],
  ["health", "Health", "Insurance, Sehat Card, hospitals"],
  ["travel", "Travel", "Visas, airports, domestic travel"],
  ["business", "Business", "Registering, licences, compliance"],
] as const;

export const BUSINESS_CATEGORIES = [
  ["restaurants", "Restaurant", "Restaurants", "🍽️"],
  ["cafes", "Cafe", "Cafes", "☕"],
  ["doctors", "Doctor", "Doctors", "🩺"],
  ["hospitals", "Hospital", "Hospitals", "🏥"],
  ["pharmacies", "Pharmacy", "Pharmacies", "💊"],
  ["dentists", "Dentist", "Dentists", "🦷"],
  ["lawyers", "Lawyer", "Lawyers", "⚖️"],
  ["tax-consultants", "Tax Consultant", "Tax Consultants", "🧾"],
  ["solar-companies", "Solar Company", "Solar Companies", "☀️"],
  ["electricians", "Electrician", "Electricians", "🔌"],
  ["plumbers", "Plumber", "Plumbers", "🔧"],
  ["car-dealers", "Car Dealer", "Car Dealers", "🚗"],
  ["car-workshops", "Car Workshop", "Car Workshops", "🛠️"],
  ["mobile-shops", "Mobile Shop", "Mobile Shops", "📱"],
  ["real-estate-agents", "Real Estate Agent", "Real Estate Agents", "🏠"],
  ["schools", "School", "Schools", "🎒"],
  ["universities", "University", "Universities", "🎓"],
  ["gyms", "Gym", "Gyms", "🏋️"],
  ["salons", "Salon", "Salons", "💇"],
  ["hotels", "Hotel", "Hotels", "🏨"],
  ["banks", "Bank Branch", "Bank Branches", "🏦"],
  ["photographers", "Photographer", "Photographers", "📷"],
  ["wedding-halls", "Wedding Hall", "Wedding Halls", "💍"],
  ["tailors", "Tailor", "Tailors", "🧵"],
  ["it-companies", "IT Company", "IT Companies", "💻"],
] as const;

export type EntityDef = { slug: string; kind: "organization" | "company" | "brand" | "product" | "person" | "place" | "commodity" | "currency" | "topic"; name: string; nameUrdu?: string; aliases?: string[]; description: string; website?: string; facts?: Record<string, string> };

export const ENTITIES: EntityDef[] = [
  { slug: "fbr", kind: "organization", name: "FBR", nameUrdu: "ایف بی آر", aliases: ["Federal Board of Revenue", "income tax department"], description: "Pakistan's federal tax authority — income tax, sales tax, customs and the filer system.", website: "https://fbr.gov.pk", facts: { Founded: "1924 (as CBR)", Headquarters: "Islamabad", Portal: "IRIS" } },
  { slug: "nadra", kind: "organization", name: "NADRA", nameUrdu: "نادرا", aliases: ["National Database and Registration Authority", "CNIC office"], description: "Issues CNICs, NICOPs, family registration certificates and runs Pakistan's identity database.", website: "https://www.nadra.gov.pk", facts: { Founded: "2000", Headquarters: "Islamabad", App: "Pak Identity" } },
  { slug: "pta", kind: "organization", name: "PTA", nameUrdu: "پی ٹی اے", aliases: ["Pakistan Telecommunication Authority", "DIRBS"], description: "Telecom regulator — licences operators, runs DIRBS phone registration and handles consumer complaints.", website: "https://www.pta.gov.pk", facts: { Founded: "1996", Headquarters: "Islamabad" } },
  { slug: "sbp", kind: "organization", name: "State Bank of Pakistan", nameUrdu: "اسٹیٹ بینک", aliases: ["SBP", "central bank", "policy rate"], description: "Pakistan's central bank — sets the policy rate, manages the rupee and regulates banks.", website: "https://www.sbp.org.pk", facts: { Founded: "1948", Headquarters: "Karachi" } },
  { slug: "nepra", kind: "organization", name: "NEPRA", aliases: ["National Electric Power Regulatory Authority", "electricity tariff"], description: "Regulates electricity generation, transmission and distribution and sets consumer tariffs.", website: "https://nepra.org.pk" },
  { slug: "ogra", kind: "organization", name: "OGRA", aliases: ["Oil and Gas Regulatory Authority", "petrol price"], description: "Regulates oil and gas — recommends fortnightly petroleum prices and gas tariffs.", website: "https://ogra.org.pk" },
  { slug: "secp", kind: "organization", name: "SECP", aliases: ["Securities and Exchange Commission of Pakistan", "company registration"], description: "Regulates companies, capital markets, insurance and non-bank finance. Company registration goes through its eZfile portal.", website: "https://www.secp.gov.pk" },
  { slug: "eobi", kind: "organization", name: "EOBI", aliases: ["Employees Old-Age Benefits Institution", "pension"], description: "Federal old-age pension scheme funded by employer and employee contributions.", website: "https://www.eobi.gov.pk" },
  { slug: "lesco", kind: "company", name: "LESCO", aliases: ["Lahore Electric Supply Company"], description: "Electricity distribution company for Lahore, Kasur, Okara, Sheikhupura and Nankana Sahib.", website: "https://www.lesco.gov.pk" },
  { slug: "k-electric", kind: "company", name: "K-Electric", aliases: ["KE", "KESC"], description: "Vertically integrated power utility serving Karachi and surrounding areas.", website: "https://www.ke.com.pk" },
  { slug: "toyota", kind: "brand", name: "Toyota", aliases: ["Indus Motor Company", "IMC", "Corolla", "Yaris", "Fortuner"], description: "Assembled in Pakistan by Indus Motor Company — Corolla, Yaris, Fortuner, Hilux and the Corolla Cross.", website: "https://www.toyota-indus.com" },
  { slug: "honda", kind: "brand", name: "Honda", aliases: ["Honda Atlas", "Civic", "City", "BR-V"], description: "Honda Atlas Cars assembles the City, Civic, BR-V and HR-V in Lahore.", website: "https://www.honda.com.pk" },
  { slug: "suzuki", kind: "brand", name: "Suzuki", aliases: ["Pak Suzuki", "Alto", "Cultus", "Swift", "Wagon R"], description: "Pak Suzuki — the largest volume car maker in Pakistan; Alto, Cultus, Swift, Wagon R, Bolan and Ravi.", website: "https://www.paksuzuki.com.pk" },
  { slug: "meezan-bank", kind: "company", name: "Meezan Bank", aliases: ["Meezan"], description: "Pakistan's largest Islamic bank — car Ijarah, home finance, Roshan Digital Accounts.", website: "https://www.meezanbank.com" },
  { slug: "hbl", kind: "company", name: "HBL", aliases: ["Habib Bank Limited"], description: "Pakistan's largest commercial bank by assets.", website: "https://www.hbl.com" },
  { slug: "apple", kind: "brand", name: "Apple", aliases: ["iPhone", "iPhone 17", "iPhone 16", "MacBook"], description: "iPhones are the most-searched devices for PTA tax in Pakistan; no official Apple store operates in the country.", website: "https://www.apple.com" },
  { slug: "samsung", kind: "brand", name: "Samsung", aliases: ["Galaxy", "Galaxy S25"], description: "Assembles Galaxy phones locally in Karachi through Lucky Motor Corporation.", website: "https://www.samsung.com/pk" },
  { slug: "jazz", kind: "company", name: "Jazz", aliases: ["Mobilink", "JazzCash"], description: "Pakistan's largest mobile operator and owner of JazzCash.", website: "https://jazz.com.pk" },
  { slug: "zong", kind: "company", name: "Zong", aliases: ["CMPak"], description: "China Mobile's Pakistani operator, known for 4G coverage.", website: "https://www.zong.com.pk" },
  { slug: "gold", kind: "commodity", name: "Gold", nameUrdu: "سونا", aliases: ["gold rate", "sona", "24k gold", "gold per tola"], description: "Gold prices in Pakistan are quoted per tola (11.664 g) and per 10 grams, tracking international rates and the rupee." },
  { slug: "petrol", kind: "commodity", name: "Petrol", nameUrdu: "پیٹرول", aliases: ["petrol price", "fuel price", "HSD", "diesel"], description: "Petroleum prices are revised fortnightly by the federal government on OGRA's recommendation." },
  { slug: "usd-pkr", kind: "currency", name: "US Dollar to Pakistani Rupee", aliases: ["dollar rate", "USD/PKR", "dollar to rupee", "interbank rate", "open market rate"], description: "The USD/PKR rate — interbank and open market — is the number most Pakistanis check daily." },
  { slug: "income-tax", kind: "topic", name: "Income Tax", nameUrdu: "انکم ٹیکس", aliases: ["tax slabs", "salary tax", "tax return", "filer"], description: "How individuals and businesses are taxed in Pakistan: slabs, filing, withholding and the filer/non-filer system." },
  { slug: "solar-energy", kind: "topic", name: "Solar Energy", aliases: ["solar panels", "net metering", "solar system"], description: "Rooftop solar has boomed in Pakistan since 2022 as tariffs rose and panel prices fell." },
  { slug: "lahore", kind: "place", name: "Lahore", nameUrdu: "لاہور", description: "Capital of Punjab and Pakistan's second-largest city." },
  { slug: "karachi", kind: "place", name: "Karachi", nameUrdu: "کراچی", description: "Pakistan's largest city, financial capital and main port." },
  { slug: "islamabad", kind: "place", name: "Islamabad", nameUrdu: "اسلام آباد", description: "Pakistan's planned federal capital." },
];

export const SYNONYMS: [string, string[]][] = [
  ["bijli", ["electricity", "power", "wapda"]],
  ["dollar", ["usd", "dollar rate", "dollar to rupee"]],
  ["sona", ["gold"]],
  ["tax", ["income tax", "fbr", "filer"]],
  ["mobile", ["phone", "smartphone", "pta"]],
  ["gari", ["car", "vehicle"]],
  ["ghar", ["house", "home", "property"]],
  ["doctor", ["clinic", "hospital", "physician"]],
  ["wakeel", ["lawyer", "advocate"]],
];

export const DATA_SERIES = [
  { slug: "petrol-price", name: "Petrol price", unit: "PKR per litre", frequency: "fortnightly", sourceName: "OGRA / Finance Division", sourceUrl: "https://ogra.org.pk", points: [["2026-06-01", 254.6], ["2026-06-16", 258.4], ["2026-07-01", 263.9], ["2026-07-16", 266.7], ["2026-08-01", 264.1], ["2026-08-16", 262.8], ["2026-09-01", 267.5]] },
  { slug: "diesel-price", name: "High-speed diesel price", unit: "PKR per litre", frequency: "fortnightly", sourceName: "OGRA / Finance Division", sourceUrl: "https://ogra.org.pk", points: [["2026-06-01", 261.9], ["2026-06-16", 264.2], ["2026-07-01", 269.1], ["2026-07-16", 272.6], ["2026-08-01", 270.3], ["2026-08-16", 268.9], ["2026-09-01", 273.4]] },
  { slug: "usd-pkr", name: "USD/PKR interbank", unit: "PKR", frequency: "daily", sourceName: "State Bank of Pakistan", sourceUrl: "https://www.sbp.org.pk", points: [["2026-09-08", 280.4], ["2026-09-09", 280.6], ["2026-09-10", 280.9], ["2026-09-11", 281.1], ["2026-09-12", 281.0], ["2026-09-14", 281.2]] },
  { slug: "gold-24k-tola", name: "Gold 24k per tola", unit: "PKR", frequency: "daily", sourceName: "Sarafa associations (Karachi / Lahore)", points: [["2026-09-08", 368_500], ["2026-09-09", 369_800], ["2026-09-10", 371_200], ["2026-09-11", 370_600], ["2026-09-12", 371_900], ["2026-09-14", 372_000]] },
  { slug: "sbp-policy-rate", name: "SBP policy rate", unit: "%", frequency: "ad-hoc", sourceName: "State Bank of Pakistan", sourceUrl: "https://www.sbp.org.pk", points: [["2025-06-16", 11.0], ["2025-07-30", 11.0], ["2025-09-15", 11.0], ["2025-10-27", 11.0], ["2025-12-15", 11.0], ["2026-03-10", 11.0], ["2026-06-16", 11.0]] },
];
