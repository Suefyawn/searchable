/**
 * Net metering / net billing in Pakistan under the NEPRA (Prosumer) Regulations — notified February 2026,
 * replacing the AR&E Distributed Generation and Net Metering Regulations 2015.
 * Regulation clauses below were read from the NEPRA text (nepra.org.pk); rupee rates are NEPRA determinations
 * as reported in the press and change annually. REVIEW QUARTERLY.
 */

export const NET_METERING_REVIEWED_AT = "2026-09-15";

export const NET_METERING_SOURCES = [
  { title: "NEPRA (Prosumer) Regulations — text as published by NEPRA", url: "https://www.nepra.org.pk/Admission%20Notices/2025/12%20Dec/NEPRA%20Prosumer%20Regulations.pdf", publisher: "National Electric Power Regulatory Authority", date: "2026-02-10" },
  { title: "Nepra pulls the plug on net-metering", url: "https://www.dawn.com/news/1972203", publisher: "Dawn", date: "2026-02-11" },
  { title: "NEPRA protects existing solar net metering users, restricts system expansion benefits", url: "https://profit.pakistantoday.com.pk/2026/04/03/nepra-protects-existing-solar-net-metering-users-restricts-system-expansion-benefits/", publisher: "Profit by Pakistan Today", date: "2026-04-03" },
];

/** The rules that matter, with the regulation number they come from. */
export const RULES = {
  notified: "2026-02-10",
  /** Reg 2(1)(e): who can apply. */
  eligibility: "Three-phase 400 V or 11 kV domestic, commercial, industrial, agricultural, general-services or bulk-supply consumer of a DISCO",
  /** Reg 2(1)(i) and Schedule I. */
  capacityRange: "1 kW to 1 MW (solar, wind or biogas)",
  /** Reg 3(2). */
  capacityCap: "Installed capacity may not exceed the sanctioned load of the premises",
  /** Reg 3(5) proviso. */
  transformerCap: 0.8,
  /** Reg 3(3). */
  loadFlowStudyFromKw: 250,
  /** Reg 7(1). */
  termYears: 5,
  /** Schedule IV. */
  nepraFeePerKw: 1_000,
  /** Reg 14: net billing. Export credited at the National Average Energy Purchase Price. */
  exportRateNew: { label: "National Average Energy Purchase Price (NAEPP)", approx: [10, 11] as [number, number] },
  /** Reg 21(2) proviso: agreements signed under the 2015 regulations. */
  exportRateExisting: { label: "National Average Power Purchase Price (NAPPP)", approx: [25, 26] as [number, number] },
  /** Reg 14(2). */
  settlement: "Monthly. If export credit exceeds the import bill, the difference is carried to the next bill or paid by the DISCO quarterly.",
  /** Reg 4(4). */
  commissionWithinMonths: 6,
  /** Reg 9 (interconnection standards). */
  standards: ["UL 1741 (inverters, converters and interconnection equipment for distributed energy resources)", "IEEE 1547-2003 (interconnection of distributed resources)", "IEC 61215 (PV module design qualification)", "IEC 62116 / anti-islanding protection (checked from the inverter certificate)"],
  /** Reg 3 & 4 — working days at each step. */
  timeline: [
    { step: "DISCO acknowledges the application and confirms it is complete", days: 5, who: "DISCO", reg: "3(5)" },
    { step: "You supply any missing documents", days: 3, who: "You", reg: "3(5)" },
    { step: "Initial technical review (feasibility, transformer loading)", days: 15, who: "DISCO", reg: "3(6)" },
    { step: "Interconnection agreement signed", days: 7, who: "Both", reg: "3(8)" },
    { step: "Connection-charge estimate (bi-directional meter, interconnection works) issued", days: 7, who: "DISCO", reg: "3(9)" },
    { step: "You pay the estimate", days: 7, who: "You", reg: "3(10)" },
    { step: "Meter installed and interconnection commissioned", days: 15, who: "DISCO", reg: "3(11)" },
    { step: "NEPRA accords concurrence (fee Rs 1,000/kW, affidavit on Rs 50 stamp paper)", days: 7, who: "NEPRA", reg: "4(3)" },
  ],
};

export type ApprovedInverter = {
  brand: string;
  models: string;
  type: "on-grid" | "hybrid" | "both";
  /** Certificates the brand supplies with the datasheet. */
  certs: string;
  /** How DISCO net-metering desks treat it in practice. */
  status: "routine" | "with-certificates";
  note?: string;
};

/**
 * Inverters that routinely pass DISCO technical review for net metering. No DISCO publishes a standing public
 * model list — the desk checks the datasheet and UL 1741 / IEC 62116 anti-islanding certificate submitted with
 * the application — so "routine" means the brand's paperwork is accepted without query across DISCOs, and
 * "with-certificates" means it is accepted when the installer attaches the test certificate.
 */
export const APPROVED_INVERTERS: ApprovedInverter[] = [
  { brand: "Huawei", models: "SUN2000 KTL-L1 (single-phase), KTL-M1 / M2 (three-phase), hybrid with LUNA2000", type: "both", certs: "UL 1741, IEC 62109-1/2, IEC 62116, VDE-AR-N 4105", status: "routine", note: "Most common inverter on commercial net-metering approvals" },
  { brand: "Sungrow", models: "SG-RS (single-phase), SG-RT (three-phase), SH-RS / SH-RT hybrids", type: "both", certs: "UL 1741, IEC 62109, IEC 62116", status: "routine" },
  { brand: "Solis (Ginlong)", models: "S5/S6-GR1P, S5/S6-GR3P, S6-EH1P and EH3P hybrids", type: "both", certs: "UL 1741, IEC 62109, IEC 62116, G98/G99", status: "routine", note: "Most common on residential approvals" },
  { brand: "GoodWe", models: "DNS, MS, SDT series; ES / ET hybrids", type: "both", certs: "UL 1741, IEC 62109, IEC 62116", status: "routine" },
  { brand: "Growatt", models: "MIN TL-X, MOD KTL3-X; SPH / SPF hybrids (SPH only for net metering)", type: "both", certs: "UL 1741, IEC 62109, IEC 62116", status: "routine", note: "SPF off-grid series is not eligible" },
  { brand: "SMA", models: "Sunny Boy, Sunny Tripower", type: "on-grid", certs: "UL 1741, IEC 62109, VDE-AR-N 4105", status: "routine", note: "German; premium, mostly industrial" },
  { brand: "Fronius", models: "Primo, Symo, Primo GEN24 / Symo GEN24 hybrids", type: "both", certs: "UL 1741, IEC 62109, IEC 62116", status: "routine" },
  { brand: "SolarEdge", models: "SE-H / SE-K with power optimisers", type: "on-grid", certs: "UL 1741, IEC 62109", status: "routine" },
  { brand: "Fox ESS", models: "H1 / H3 hybrids, T-series on-grid", type: "both", certs: "IEC 62109, IEC 62116", status: "with-certificates" },
  { brand: "Sofar", models: "KTLX-G3, HYD hybrids", type: "both", certs: "IEC 62109, IEC 62116", status: "with-certificates" },
  { brand: "SolaX", models: "X1 / X3 on-grid, X1/X3-Hybrid", type: "both", certs: "IEC 62109, IEC 62116", status: "with-certificates" },
  { brand: "Kstar", models: "BluE series", type: "both", certs: "IEC 62109, IEC 62116", status: "with-certificates" },
  { brand: "Deye", models: "SUN-K-G on-grid; SUN-SG LP1 / SG04LP3 hybrids", type: "both", certs: "IEC 62109, IEC 62116", status: "with-certificates", note: "Widely approved by LESCO, IESCO and MEPCO on residential hybrids since 2024" },
  { brand: "Inverex", models: "Aerox (on-grid), Nitrox (hybrid)", type: "both", certs: "IEC 62109, IEC 62116 (Nitrox / Aerox datasheets)", status: "with-certificates", note: "Veyron and Yukon off-grid ranges are not eligible" },
  { brand: "Ziewnic", models: "Xtreme hybrid, Zi-Grid on-grid", type: "both", certs: "IEC 62109, IEC 62116", status: "with-certificates", note: "X-Core off-grid range is not eligible" },
  { brand: "Livoltek", models: "GT on-grid, HYT hybrids", type: "both", certs: "IEC 62109, IEC 62116", status: "with-certificates" },
  { brand: "Sunlife / Tiger / Knox / Crown / Homage", models: "Hybrid models with grid-tie mode", type: "hybrid", certs: "Varies by model — ask for the IEC 62116 anti-islanding certificate", status: "with-certificates", note: "Some models are off-grid units with a grid pass-through and are refused; check before buying" },
];

/** Not eligible under any DISCO. */
export const NOT_ELIGIBLE = ["Off-grid inverters (Inverex Veyron/Yukon, Ziewnic X-Core, Crown Xavier, Knox Infini, Homage HVS and similar) — no anti-islanding or export control", "Micro-inverters and inverters without a UL 1741 / IEC 62116 certificate", "Second-hand imported inverters with region-locked grid codes that cannot be set to Pakistan / IEEE 1547 parameters"];

export type DiscoNetMetering = {
  slug: string;
  /** Where applications go. */
  apply: string;
  applyUrl?: string;
  /** Typical bi-directional meter + interconnection estimate, Rs. */
  meterCost: [number, number];
  notes: string[];
};

/** Per-DISCO net-metering desks. Costs are the usual connection-charge estimates reported by installers in 2026. */
export const DISCO_NET_METERING: DiscoNetMetering[] = [
  { slug: "lesco", apply: "Net Metering Cell, LESCO headquarters (22-A Queens Road, Lahore), or through your sub-division; installers submit online via the LESCO net-metering portal.", applyUrl: "https://www.lesco.gov.pk", meterCost: [30_000, 55_000], notes: ["Largest number of prosumers in the country; transformer 80% cap is now the most common reason for refusal in DHA, Johar Town and Bahria Town.", "Requires the installer's AEDB/PPIB certificate and single-line diagram stamped by a PEC-registered engineer."] },
  { slug: "iesco", apply: "Net Metering Section, IESCO Head Office (Street 40, G-7/4, Islamabad) or the concerned sub-division (Rawalpindi, Attock, Jhelum, Chakwal).", applyUrl: "https://www.iesco.com.pk", meterCost: [25_000, 50_000], notes: ["Historically the fastest DISCO for residential approvals (30–45 days end to end).", "Three-phase upgrade of a single-phase house connection is processed as a separate demand notice first."] },
  { slug: "mepco", apply: "Net Metering Cell at MEPCO headquarters (Khanewal Road, Multan) or the circle office (Bahawalpur, DG Khan, Sahiwal, Rahim Yar Khan).", applyUrl: "https://www.mepco.com.pk", meterCost: [30_000, 60_000], notes: ["Agricultural (tube-well) connections are eligible up to the sanctioned load; load-flow study needed at 250 kW and above."] },
  { slug: "gepco", apply: "GEPCO headquarters (565-A Model Town, Gujranwala) or circle offices in Sialkot and Gujrat.", applyUrl: "https://www.gepco.com.pk", meterCost: [30_000, 55_000], notes: ["Industrial units in Sialkot and Gujranwala make up most of the capacity; residential queues are shorter."] },
  { slug: "fesco", apply: "FESCO headquarters (West Canal Road, Abdullahpur, Faisalabad) or the circle office (Sargodha, Jhang, Mianwali).", applyUrl: "https://www.fesco.com.pk", meterCost: [30_000, 55_000], notes: [] },
  { slug: "pesco", apply: "PESCO headquarters (WAPDA House, Shami Road, Peshawar) or the circle office (Mardan, Abbottabad, Swat, Bannu).", applyUrl: "https://www.pesco.gov.pk", meterCost: [30_000, 60_000], notes: ["Meter availability has caused multi-month delays; ask the sub-division for the current stock position before paying the estimate."] },
  { slug: "hesco", apply: "HESCO headquarters (WAPDA Complex, Hussainabad, Hyderabad) or circle offices.", applyUrl: "https://www.hesco.gov.pk", meterCost: [30_000, 60_000], notes: [] },
  { slug: "sepco", apply: "SEPCO headquarters (Sukkur) or circle offices in Larkana and Khairpur.", applyUrl: "https://www.sepco.com.pk", meterCost: [30_000, 60_000], notes: [] },
  { slug: "qesco", apply: "QESCO headquarters (Zarghoon Road, Quetta).", applyUrl: "https://www.qesco.com.pk", meterCost: [30_000, 60_000], notes: ["Agricultural solarisation schemes in Balochistan run separately from net metering."] },
  { slug: "tesco", apply: "TESCO headquarters (Peshawar) — very few residential approvals to date.", meterCost: [30_000, 60_000], notes: [] },
  { slug: "k-electric", apply: "Online through the K-Electric net-metering portal / KE Live app, or the Distributed Generation cell at KE House (Sunset Boulevard, DHA Karachi).", applyUrl: "https://www.ke.com.pk", meterCost: [35_000, 65_000], notes: ["KE runs its own online tracking; installers upload the datasheet, IEC/UL certificates and AEDB certificate at application.", "KE's tariff is determined separately by NEPRA but the Prosumer Regulations apply to it in the same way."] },
];
