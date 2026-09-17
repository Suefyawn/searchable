/*
 * Titles and descriptions for the hub pages, written against what people in Pakistan actually type
 * (Semrush, pk database, September 2026). A title carries the query in its first words, stays under about
 * 65 characters, and a description says what is on the page in 120 to 155 characters. Category pages that
 * have no entry here fall back to a template that still leads with the query.
 */

export type SeoCopy = { title: string; description: string; h1?: string };

/** /news/[category] */
export const NEWS_CATEGORY_COPY: Record<string, SeoCopy> = {
  pakistan: { title: "Pakistan News Today: Latest Updates Explained", description: "Today's Pakistan news with the numbers and what each story means for you: government decisions, prices, rules and deadlines, updated through the day." },
  politics: { title: "Pakistan Politics News: Parliament, Parties, Elections", description: "Political news from Pakistan explained plainly: what parliament, the parties, the courts and the election commission decided and what changes for you." },
  business: { title: "Business News Pakistan: Companies, Deals, Markets", description: "Pakistan business news: company results, deals, banking, telecom and energy decisions, with the figures and what they mean for prices and jobs." },
  economy: { title: "Pakistan Economy News: Inflation, Rupee, Fuel, SBP, FBR", description: "Economy news from Pakistan: inflation, the rupee, petrol prices, State Bank rate decisions, FBR taxes and the IMF programme, with what each change costs you." },
  markets: { title: "PSX Today: KSE-100 Index News and Market Updates", description: "Pakistan Stock Exchange news: the KSE-100 today, the stocks that moved and why, dividends, IPOs and what the market is pricing in." },
  crypto: { title: "Crypto News Pakistan: Bitcoin Price in PKR, Rules, Exchanges", description: "Bitcoin and crypto news for Pakistani investors: prices in rupees, SBP and PVARA rules, exchanges that work here and the tax position." },
  technology: { title: "Technology News Pakistan: Mobiles, PTA, Internet, Apps", description: "Tech news for Pakistan: mobile phone prices and PTA tax, internet and 5G, apps and services launching here, and the rules that affect your phone." },
  ai: { title: "AI News: What Artificial Intelligence Means for Pakistan", description: "AI news read for Pakistan: the tools people here use, jobs and freelancing, government AI policy and what each launch changes for students and businesses." },
  science: { title: "Science News Pakistan: Space, Climate, Health Research", description: "Science news that matters in Pakistan: SUPARCO, climate and monsoon research, health studies and discoveries, explained without jargon." },
  world: { title: "World News Today for Pakistan: What Matters Here", description: "World news from a Pakistani reader's point of view: the Gulf, China, India, the US and Europe, with what each story means for remittances, visas and prices." },
  us: { title: "US News for Pakistanis: Visas, Markets, Policy", description: "United States news that affects Pakistan: visa and immigration rules, the dollar, tariffs and trade, US politics and the Pakistani community." },
  sports: { title: "Sports News Pakistan: Cricket, Football, Hockey, MMA", description: "Sports news from Pakistan and the events Pakistanis follow: cricket, football, hockey, squash, MMA and snooker, with results, schedules and what comes next." },
  cricket: { title: "Pakistan Cricket News Today: Team, PSL, Results, Schedule", description: "Pakistan cricket news: the national team, PSL, Asia Cup and World Cup schedules, results, squads, points tables and where to watch, updated every day." },
  mma: { title: "MMA News Pakistan: UFC, PFL, Pakistani Fighters", description: "MMA news for Pakistani fans: UFC and PFL cards, results, Pakistani fighters abroad and at home, and where and when to watch in Pakistan." },
  snooker: { title: "Snooker News: Pakistan Players, World Rankings, Results", description: "Snooker news with Pakistan's players first: world championship and ranking events, results, schedules and the country's rising cueists." },
  education: { title: "Education News Pakistan: Results, Admissions, Scholarships", description: "Education news for Pakistan: board and university results, admission dates, HEC and scholarship announcements, fees and exam schedules." },
  health: { title: "Health News Pakistan: Hospitals, Medicines, Outbreaks", description: "Health news for Pakistan: medicine prices and recalls, hospital services, vaccination drives, outbreaks and the public-health decisions that affect you." },
  auto: { title: "Auto News Pakistan: Car Prices, Launches, Fuel, Rules", description: "Car and bike news for Pakistan: new prices and launches, fuel prices, registration and token tax changes, financing rates and road rules." },
  property: { title: "Property News Pakistan: Prices, Taxes, DHA, Bahria, Schemes", description: "Property news for Pakistan: plot and house prices, stamp duty and CVT changes, DHA and Bahria updates, housing schemes and construction costs." },
  lifestyle: { title: "Lifestyle Pakistan: Food, Travel, Money, Everyday Life", description: "Lifestyle for Pakistan: food and restaurants, travel and Umrah, shopping and prices, fashion and everyday life, with the costs worked out." },
  entertainment: { title: "Entertainment News Pakistan: Dramas, Films, Music, Celebrities", description: "Pakistani entertainment news: dramas and their ratings, films and box office, music, award shows and celebrity news, without the gossip." },
  viral: { title: "Viral in Pakistan Today: What Everyone Is Talking About", description: "What is going viral in Pakistan right now: the videos, posts and stories everyone is sharing, verified and explained." },
};

/** /guides/[category] */
export const GUIDE_CATEGORY_COPY: Record<string, SeoCopy> = {
  taxes: { title: "Tax Guides Pakistan: Income Tax, FBR Filing, Withholding", description: "Step-by-step tax guides for Pakistan: income tax slabs, FBR IRIS return filing, filer vs non-filer, withholding rates and sales tax, with the current numbers." },
  banking: { title: "Banking Guides Pakistan: Accounts, Loans, Savings, Remittances", description: "Guides to banking in Pakistan: opening accounts, credit cards, home and car loans, National Savings, prize bonds, zakat and sending money home." },
  cars: { title: "Car Guides Pakistan: Registration, Transfer, Token Tax, Licence", description: "Guides for car owners in Pakistan: registration and transfer, token tax, vehicle verification, driving licence, fitness tests and financing." },
  property: { title: "Property Guides Pakistan: Buying, Transfer, Stamp Duty, Rent", description: "Guides to buying, selling and renting property in Pakistan: transfer process, stamp duty and CVT, DHA and Bahria files, mutation and rental agreements." },
  government: { title: "Government Guides Pakistan: NADRA, Passport, BISP, Fees", description: "How government services in Pakistan actually work: NADRA CNIC, passport fees, BISP 8171, birth certificates and other processes, with fees and timelines." },
  utilities: { title: "Utility Bill Guides Pakistan: Electricity, Gas, Water, Internet", description: "Guides to utility bills in Pakistan: check any electricity bill online (LESCO, IESCO, MEPCO, K-Electric), Sui gas bills, meters, net metering and complaints." },
  telecom: { title: "Telecom Guides Pakistan: SIM, PTA Tax, Packages, IMEI", description: "Telecom guides for Pakistan: SIM registration and ownership checks, PTA tax and IMEI approval, mobile packages and number portability." },
  education: { title: "Education Guides Pakistan: Admissions, Results, Scholarships", description: "Education guides for Pakistan: university and college admissions, board results, HEC degree attestation, scholarships and study abroad steps." },
  health: { title: "Health Guides Pakistan: Sehat Card, Hospitals, Medicines", description: "Health guides for Pakistan: Sehat Sahulat card, finding a hospital or specialist, medicine prices, vaccinations and health insurance." },
  travel: { title: "Travel Guides Pakistan: Visas, Umrah, Passports, Airports", description: "Travel guides for Pakistanis: visa requirements and costs, Umrah and Hajj, passport renewal, airport procedures and domestic travel." },
  business: { title: "Business Guides Pakistan: SECP, NTN, Registration, Freelancing", description: "Guides to starting and running a business in Pakistan: SECP registration, NTN and sales tax, freelancing and PSEB, bank accounts and invoicing." },
};

/** /tools/[category] */
export const TOOL_CATEGORY_COPY: Record<string, SeoCopy> = {
  tax: { title: "Tax Calculators Pakistan 2026-27: Income Tax, Salary, PTA", description: "Free tax calculators for Pakistan with the 2026-27 rates: income tax on salary, take-home pay, withholding for filers and non-filers, PTA mobile tax and sales tax." },
  finance: { title: "Finance Calculators Pakistan: Zakat, Loans, Savings, Salary", description: "Finance calculators for Pakistan: zakat on gold and cash, loan and car finance instalments, National Savings profit, take-home salary and remittances." },
  cars: { title: "Car Calculators Pakistan: Token Tax, Financing, Fuel Cost", description: "Car calculators for Pakistan: token tax by engine size, car financing instalments, fuel cost per month and the real cost of owning a car." },
  property: { title: "Property Calculators Pakistan: Stamp Duty, CVT, Rental Yield", description: "Property calculators for Pakistan: stamp duty and CVT on transfer, capital gains tax, rental yield, plot size conversion (marla, kanal, square feet)." },
  utilities: { title: "Bill Calculators Pakistan: Electricity Units, AC Cost, Gas", description: "Utility calculators for Pakistan: electricity bill from units with the current slab rates, AC running cost, solar payback and gas bills." },
  government: { title: "Government Fee Calculators Pakistan: Passport, NADRA, Licences", description: "Calculators for government fees in Pakistan: passport fees by validity and pages, NADRA charges, licence fees and processing timelines." },
  solar: { title: "Solar Calculators Pakistan: System Size, Payback, Net Metering", description: "Solar calculators for Pakistan: the system size your bill needs, panel and inverter cost, payback period and net-metering credit under the current rules." },
  telecom: { title: "Telecom Calculators Pakistan: PTA Tax, Packages, Mobile Cost", description: "Telecom calculators for Pakistan: PTA tax on any phone by value and passport or CNIC, mobile package cost per GB and per minute." },
  education: { title: "Education Calculators Pakistan: CGPA, GPA, Percentage", description: "Calculators for students in Pakistan: semester GPA and cumulative CGPA on the HEC 4.0 scale, with what you need next semester to reach your target." },
};

export const HUB_COPY = {
  home: { title: "Searchable.pk: Pakistan News Today, Prices, Guides, Calculators", description: "Pakistan news today with the numbers explained, petrol and gold prices, dollar rate, weather and prayer times, step-by-step guides, calculators and a business directory." },
  news: { title: "Pakistan News Today: Latest News, Explained With the Numbers", description: "Latest news from Pakistan and the world, written for readers here: economy, prices, government decisions, cricket, technology and more, updated six times a day." },
  guides: { title: "Guides Pakistan: How to Do Things Step by Step", description: "Step-by-step guides for life in Pakistan: taxes, bills, NADRA, passports, cars, property, banking and telecom, with fees, timelines and the mistakes to avoid." },
  tools: { title: "Calculators for Pakistan: Tax, Salary, Zakat, Bills, Loans", description: "Free calculators built for Pakistan with sourced 2026 rates: income tax and take-home salary, zakat, electricity bill, PTA tax, car finance, stamp duty and more." },
  businesses: { title: "Business Directory Pakistan: Hospitals, Banks, Dealers, Services", description: "Find businesses across Pakistan by category and city: hospitals, universities, solar installers, car dealers, banks and services, with phone numbers and addresses." },
  professionals: { title: "Find a Professional in Pakistan: Doctors, Lawyers, Tutors", description: "Verified professionals in Pakistan: doctors, lawyers, engineers, architects, electricians, tutors and more, by city, with profiles, fees and contact details." },
  data: { title: "Pakistan Prices and Rates Today: Petrol, Gold, Dollar, KSE-100", description: "Today's prices and rates in Pakistan with full history: petrol and diesel, gold and silver per tola, dollar, riyal and dirham rates, KSE-100, SBP policy rate and inflation." },
  compare: { title: "Compare in Pakistan: Cars, ACs, Credit Cards, Mobile Packages", description: "Side-by-side comparisons for buyers in Pakistan: new car prices, air conditioners, credit cards, mobile packages, solar inverters and National Savings schemes." },
  cities: { title: "Cities in Pakistan: Local Businesses, Weather, Prayer Times", description: "City pages for Pakistan: Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Peshawar and more, with local businesses, bills, weather, prayer times and news." },
  community: { title: "Community Pakistan: Jobs, For Sale, Questions, Discussions", description: "Searchable's community for Pakistan: job posts, items for sale, auctions, questions answered by locals and discussions on money, cars, property and daily life." },
  electricity: { title: "Electricity Bill Check Online: LESCO, MEPCO, IESCO, K-Electric", description: "Check any electricity bill online in Pakistan by reference number, see the per-unit price and calculate a bill from units. LESCO, IESCO, MEPCO, GEPCO, FESCO, PESCO, HESCO, K-Electric." },
  pta: { title: "PTA Tax Check and IMEI Check 2026: Approved Status, Tax List", description: "Check if a phone is PTA approved by IMEI, see the PTA tax on any model on passport or CNIC, and register through DIRBS, with the current 2026 tax list." },
} satisfies Record<string, SeoCopy>;

/** Category pages without a hand-written entry still lead with the query. */
export function fallbackCategoryCopy(kind: "news" | "guide" | "tool", name: string, description?: string | null): SeoCopy {
  if (kind === "news") return { title: `${name} News Pakistan: Latest Updates Explained`, description: description ?? `${name} news from Pakistan with the numbers and what each story means for you, updated through the day.` };
  if (kind === "guide") return { title: `${name} Guides Pakistan: Step-by-Step, With Fees and Timelines`, description: description ?? `Step-by-step ${name.toLowerCase()} guides for Pakistan with current fees, timelines, official links and the mistakes to avoid.` };
  return { title: `${name} Calculators for Pakistan`, description: description ?? `Free ${name.toLowerCase()} calculators built for Pakistan, with sourced rates and review dates.` };
}
