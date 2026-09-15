/** SAMPLE guides for the local prototype. Written as launch-quality drafts; verify before publishing live. */
export type ArticleDef = {
  slug: string;
  category: string;
  title: string;
  dek: string;
  body: string;
  faqs?: { question: string; answer: string }[];
  sources?: { title: string; url?: string; publisher?: string }[];
  entities?: string[];
  featured?: boolean;
  publishedDaysAgo?: number;
  city?: string;
};

export const GUIDES: ArticleDef[] = [
  {
    slug: "how-to-become-a-tax-filer-in-pakistan",
    category: "taxes",
    title: "How to become a tax filer in Pakistan (2026)",
    dek: "Registering with FBR takes about 20 minutes online. Being on the Active Taxpayer List halves the withholding tax you pay on cars, property, bank transactions and phones.",
    featured: true,
    entities: ["fbr", "income-tax", "nadra"],
    body: `## Why it matters

Pakistan taxes **non-filers** at roughly double the withholding rates of filers on vehicle registration, property purchase, cash withdrawals above the threshold, dividends and profit on debt. If you earn any taxable income — or plan to buy a car or plot — being on the **Active Taxpayer List (ATL)** saves real money.

## Summary

| | |
|---|---|
| **Time** | 20–30 minutes online |
| **Cost** | Free |
| **Where** | FBR IRIS portal (iris.fbr.gov.pk) |
| **You need** | CNIC, a mobile number registered in your name, an email address, and details of your income |

## Step 1 — Register for an NTN on IRIS

1. Go to the IRIS portal and choose **Registration for Unregistered Person**.
2. Enter your CNIC, name as per CNIC, mobile number (must be registered in your own name), and email.
3. You will receive separate codes by SMS and email. Enter both.
4. Set a password. Your **NTN is your CNIC number** for individuals.

## Step 2 — Complete your registration profile

Log in, open **Registration → Form 181**, and fill in your address, employer (if salaried), business details (if any), and bank account. Submit. This step is often skipped and is why registrations show as incomplete.

## Step 3 — File your income tax return

Filing is what puts you on the ATL. From **Declaration → Income Tax Return**, pick the tax year and:

- **Salaried individuals:** enter salary from your employer's annual certificate, tax already deducted, and any other income. Use our [Income Tax Calculator](/tools/tax/income-tax-calculator) to sanity-check the tax due.
- **Business individuals:** enter revenue, expenses and net profit.

Then complete the **Wealth Statement** — assets and liabilities at the end of the year, with a reconciliation against last year. Submit both.

## Step 4 — Check the Active Taxpayer List

The ATL updates every Monday. Confirm your status by SMS: send **ATL (space) CNIC** to **9966**, or search the ATL on the FBR website.

## Deadlines

The return for a tax year (July–June) is due by **30 September** for individuals. File late and you pay a surcharge to be added to the ATL — Rs 1,000 for individuals.

## Common problems

- **Mobile number not in your name:** IRIS cannot send the code. Fix ownership with your operator first.
- **Registration "in process":** usually Form 181 was never submitted.
- **Can't see the ATL entry:** you registered but did not file a return, or you filed after the deadline without paying the surcharge.`,
    faqs: [
      { question: "Do I need an NTN if I am salaried?", answer: "Yes. Your CNIC becomes your NTN once you register on IRIS. Your employer deducts tax, but only filing a return puts you on the ATL." },
      { question: "Is there a fee to become a filer?", answer: "Registration and filing are free. A late-filing surcharge of Rs 1,000 applies if you file after the deadline and want to be on the ATL." },
      { question: "Can overseas Pakistanis become filers?", answer: "Yes. Non-resident Pakistanis register the same way and file a return declaring Pakistan-source income, if any." },
      { question: "What is the difference between filer and non-filer?", answer: "A filer appears on the Active Taxpayer List and pays lower withholding tax rates on many transactions. A non-filer pays the higher rates listed for persons not on the ATL." },
    ],
    sources: [
      { title: "FBR — IRIS registration", url: "https://iris.fbr.gov.pk", publisher: "Federal Board of Revenue" },
      { title: "Income Tax Ordinance 2001, section 114 and Tenth Schedule", publisher: "FBR" },
    ],
  },
  {
    slug: "how-to-file-income-tax-return-pakistan",
    category: "taxes",
    title: "How to file your income tax return on FBR IRIS, step by step",
    dek: "A salaried return takes under an hour once you have your salary certificate and bank statements. Here is every screen, what to enter, and the mistakes that trigger notices.",
    entities: ["fbr", "income-tax"],
    body: `## Before you start

Collect:

- **Annual salary certificate** from your employer (shows gross salary and tax deducted under section 149).
- **Bank statements** for 1 July – 30 June for every account.
- **Withholding certificates**: mobile operators, banks (profit on debt), vehicle token tax, property transactions.
- Last year's wealth statement, if you filed before.

## 1. Open the return

Log in to IRIS → **Declaration** → **114(1) Return of Income** → select the tax year.

## 2. Salary

Under **Employment → Salary**, enter total gross salary. Enter tax deducted by the employer under **Tax Chargeable / Adjustable Tax → Salary of Employees u/s 149**.

## 3. Other income

- **Profit on bank deposits** — under Other Sources; enter the profit and the tax withheld (from the bank certificate).
- **Rental income**, **capital gains**, **dividends** — each has its own section.

## 4. Adjustable tax

Withholding you already paid on mobile bills, vehicle token, property purchase, cash withdrawals, etc. Enter each with the amount so it is credited against your liability. Missing these is the most common reason people overpay.

## 5. Tax computation

IRIS calculates tax on the slabs automatically. Compare it with our [calculator](/tools/tax/income-tax-calculator). If tax deducted exceeds tax due, the difference becomes a **refund** claim.

## 6. Wealth statement (section 116)

List assets at cost (property, vehicles, bank balances, investments, gold, cash) and liabilities. The **reconciliation** must balance: last year's net wealth + this year's income − expenses = this year's net wealth. Unexplained increases in wealth are what draw notices.

## 7. Submit

Verify with the PIN sent to your mobile. Download the acknowledgement. Check the ATL the following Monday.

## Mistakes that trigger notices

1. Bank deposits larger than declared income.
2. A car or property in your name that is missing from the wealth statement.
3. Foreign remittances without a bank certificate.
4. Declaring salary lower than what the employer reported.`,
    faqs: [
      { question: "Can I file a return without a wealth statement?", answer: "Individuals must file both; the return is incomplete without the wealth statement and will not put you on the ATL." },
      { question: "What if my employer did not deduct tax?", answer: "You still owe tax on your income. Pay the balance via a PSID generated in IRIS before submitting." },
      { question: "How do I revise a submitted return?", answer: "Within 60 days you can file a revised return without approval; after that, you need the Commissioner's permission." },
    ],
    sources: [{ title: "FBR — Filing income tax return user guide", url: "https://fbr.gov.pk", publisher: "FBR" }],
  },
  {
    slug: "how-to-register-phone-with-pta",
    category: "telecom",
    title: "How to register an imported phone with PTA (DIRBS) and pay the tax",
    dek: "Bring a phone from abroad and you have 120 days of free use per passport. After that it must be registered on DIRBS — here is the process, the documents and how to pay.",
    featured: true,
    entities: ["pta", "fbr", "apple", "samsung"],
    body: `## What DIRBS is

The **Device Identification, Registration and Blocking System** checks every phone's IMEI against a whitelist. Unregistered phones work for 120 days after first use on a Pakistani SIM, then lose network access until taxes are paid.

## Summary

| | |
|---|---|
| **Time** | 10 minutes to apply; PSID usually within 24 hours |
| **Cost** | Depends on phone value — use the [PTA Tax Calculator](/tools/telecom/pta-mobile-tax-calculator) |
| **Where** | dirbs.pta.gov.pk or SMS to 8484 |
| **You need** | IMEI(s), CNIC or passport, arrival date (for passport) |

## Step 1 — Find your IMEI

Dial **\\*#06#**. Dual-SIM phones show two IMEIs; you will register both under one application.

## Step 2 — Check the phone's status

SMS the 15-digit IMEI to **8484**. The reply says *compliant* (already registered), *non-compliant* (needs registration) or *blocked*.

## Step 3 — Apply on DIRBS

1. Create an account at the DIRBS portal (local or overseas Pakistani / foreigner).
2. Choose **Individual COC** (Certificate of Compliance).
3. Enter IMEI(s), pick **passport** (if within 60 days of arrival — cheaper) or **CNIC**, and submit.

## Step 4 — Pay the PSID

FBR generates a **PSID** with the exact amount. Pay through any bank app, ATM, or branch under *FBR – Mobile Device Tax*. Registration completes within a day of payment.

## Passport vs CNIC

Rates are lower on a passport but only within **60 days of arrival**; the arrival stamp date is checked. After 60 days, you must use CNIC rates.

## Buying a phone locally?

Ask the seller to show the IMEI as **PTA approved** before paying. "Non-PTA" phones are cheaper because the tax has not been paid — you will pay it, or the phone will be blocked.`,
    faqs: [
      { question: "Can I use a non-PTA phone with WiFi only?", answer: "Yes. Blocking only affects SIM/network use; WiFi keeps working." },
      { question: "Is there any exemption?", answer: "Overseas Pakistanis get the 120-day temporary registration per passport visit, renewable on each entry. No permanent exemption exists." },
      { question: "What if I paid but it still shows blocked?", answer: "Allow 24 hours after payment. If still blocked, raise a complaint on the PTA CMS portal with the PSID and payment receipt." },
    ],
    sources: [{ title: "PTA — DIRBS user guide", url: "https://dirbs.pta.gov.pk", publisher: "Pakistan Telecommunication Authority" }],
  },
  {
    slug: "how-to-apply-for-net-metering-in-pakistan",
    category: "utilities",
    title: "How to apply for net metering in Pakistan in 2026 (LESCO, IESCO, MEPCO, K-Electric)",
    dek: "Net metering became net billing in February 2026 under NEPRA's Prosumer Regulations. Here is who qualifies, what it costs, which inverters pass, and the step-by-step process with the working-day limits the DISCO must meet.",
    entities: ["nepra", "lesco", "k-electric", "solar-energy"],
    body: `## What changed in 2026

NEPRA notified the **Prosumer Regulations** on 10 February 2026, repealing the 2015 net-metering regulations. The new arrangement is **net billing**:

- Units you **import** are billed at your normal slab tariff (Rs 37–55 before taxes).
- Units you **export** are credited at the **National Average Energy Purchase Price (NAEPP)** — about **Rs 10–11 per unit** — instead of one-for-one.
- Credits are settled **monthly**; a surplus rolls to the next bill or is paid quarterly.
- New agreements run **5 years**, renewable.
- Existing agreements keep their term and are credited at the higher **NAPPP (about Rs 25–26)** until expiry, then renew on the new terms.

Self-consumption is now worth four to five times more than export, so size the system to your daytime load. The full rules, timelines and DISCO-by-DISCO details are on the [net metering hub](/electricity/net-metering).

## Eligibility

- **Three-phase 400 V (or 11 kV) connection** — domestic, commercial, industrial, agricultural or bulk. Single-phase houses must upgrade first.
- System **1 kW to 1 MW**, and **not above your sanctioned load**.
- Your distribution transformer must have room: the DISCO must refuse once solar on it reaches **80% of its rating**.
- Installer certified by **AEDB/PPIB**; single-line diagram signed by a PEC-registered engineer.
- **Grid-tied or hybrid inverter** with a UL 1741 / IEC 62116 anti-islanding certificate. Off-grid inverters never qualify — see the [approved inverter list](/electricity/net-metering#approved-inverters).

## Documents

- CNIC copy of the consumer named on the bill
- Latest electricity bill (reference number and sanctioned load)
- Proof of ownership or tenancy with owner's NOC
- Installer's AEDB/PPIB certificate
- Inverter datasheet and anti-islanding / grid-code certificate
- Panel datasheets (IEC 61215)
- Single-line diagram and site photos
- Application on Schedule II of the regulations (the DISCO or installer supplies the form)

## Steps and time limits

| # | Step | Who | Limit |
|---|---|---|---|
| 1 | Submit the application with documents | You | — |
| 2 | DISCO acknowledges and confirms completeness | DISCO | 5 working days |
| 3 | Supply anything missing | You | 3 working days |
| 4 | Technical review (feasibility, transformer loading) | DISCO | 15 working days |
| 5 | Sign the interconnection agreement | Both | 7 working days |
| 6 | DISCO issues the connection-charge estimate (bi-directional meter) | DISCO | 7 working days |
| 7 | Pay the estimate | You | 7 working days |
| 8 | Meter installed and system commissioned | DISCO | 15 working days |
| 9 | NEPRA concurrence (Rs 1,000/kW fee + affidavit) | NEPRA | 7 working days |

About **66 working days** end to end if nothing is returned. Billing under net billing starts from NEPRA's concurrence. You must commission within six months of concurrence, and any later change to the system's technical parameters (more panels, bigger inverter) needs fresh concurrence.

## Costs

| Item | Amount |
|---|---|
| NEPRA concurrence fee | Rs 1,000 per kW (Rs 5,000 for 5 kW) |
| DISCO meter and interconnection estimate | Rs 25,000–65,000 depending on DISCO |
| Affidavit | Rs 50 stamp paper |
| Three-phase upgrade if needed | Rs 25,000–60,000 |
| Installer processing (optional) | Rs 10,000–30,000 |

## Where to apply

- **LESCO** — Net Metering Cell, 22-A Queens Road, Lahore, or through your sub-division.
- **IESCO** — Net Metering Section, Head Office, G-7/4 Islamabad, or the sub-division for Rawalpindi, Attock, Jhelum, Chakwal.
- **MEPCO** — Net Metering Cell, Khanewal Road, Multan, or the circle office.
- **K-Electric** — online through KE's net-metering portal / KE Live, or the Distributed Generation cell at KE House, DHA Karachi.
- Other DISCOs: the headquarters net-metering cell or circle office — addresses on the [hub page](/electricity/net-metering#discos).

## If the DISCO stalls

Every step above has a working-day limit in regulations 3 and 4. Quote the regulation number in a written complaint to the DISCO's net-metering cell; if it is ignored, complain to NEPRA's Consumer Affairs Division (complaints portal on nepra.org.pk) citing regulation 17.

## Is it still worth it?

Run your numbers in the [Solar System Calculator](/tools/solar/solar-payback-calculator) with the export rate at Rs 11. For most homes using 60% or more of their generation directly, payback is still 3–4 years; for a system that mostly exports, it stretches to 6+ years.`,
    faqs: [
      { question: "How long does net metering approval take in 2026?", answer: "The regulations allow about 66 working days across all steps; in practice LESCO and IESCO take one to three months, longer where bi-directional meters are short." },
      { question: "Can I get net metering on a single-phase connection?", answer: "No. The 2026 regulations define an applicant as a three-phase 400 V or 11 kV consumer. Apply for a three-phase upgrade first." },
      { question: "What is the export rate under net billing?", answer: "The National Average Energy Purchase Price, about Rs 10–11 per unit for new agreements. Existing agreements are credited at the National Average Power Purchase Price, about Rs 25–26, until they expire." },
      { question: "Do I still get a bill?", answer: "Yes. Import is billed at your tariff, export is credited at the NAEPP, and the difference plus fixed charges and taxes is your bill. A surplus rolls to the next month or is paid quarterly." },
      { question: "Which inverter should I buy for net metering?", answer: "A grid-tied or hybrid unit with a UL 1741 / IEC 62116 certificate: Huawei, Sungrow, Solis, GoodWe, Growatt, SMA and Fronius pass without query; Deye, Inverex Nitrox/Aerox, Ziewnic Xtreme and others pass with the certificate attached. Off-grid inverters are refused." },
    ],
    sources: [
      { title: "NEPRA (Prosumer) Regulations, 2026", url: "https://www.nepra.org.pk/Admission%20Notices/2025/12%20Dec/NEPRA%20Prosumer%20Regulations.pdf", publisher: "NEPRA" },
      { title: "Nepra pulls the plug on net-metering", url: "https://www.dawn.com/news/1972203", publisher: "Dawn" },
    ],
  },
  {
    slug: "how-to-register-a-vehicle-in-punjab",
    category: "cars",
    title: "How to register a new car in Punjab and get a number plate",
    dek: "New vehicles are registered with the Excise & Taxation Department of the province where you live. Punjab's process is online-first through e-Pay and the Excise portal.",
    entities: ["toyota", "honda", "suzuki"],
    body: `## Documents

- Sales invoice / delivery order from the dealer
- Sales certificate and Form 'F'
- CNIC copy
- Proof of address (utility bill)
- Filer status (affects withholding tax)

## Costs (indicative)

| Item | Basis |
|---|---|
| Registration fee | 1–4% of vehicle value by engine size |
| Withholding tax (section 231B) | Slab by engine capacity; roughly double for non-filers |
| Token tax | Annual, by engine size |
| Number plate | Fixed fee |

Filer vs non-filer differences alone can exceed Rs 100,000 on a 1,500 cc car — see [how to become a filer](/guides/taxes/how-to-become-a-tax-filer-in-pakistan).

## Steps

1. Dealer provides invoice and Form F.
2. Generate a PSID on the Punjab **e-Pay** app for registration fee, withholding tax and token tax; pay via bank app.
3. Submit the file at the Excise office (or via the dealer) with payment receipts.
4. Physical inspection of chassis and engine numbers.
5. Registration book (or smart card) and number plate are issued; plates are delivered by post in Lahore.

## Timelines

7–15 working days in Lahore; longer in smaller districts.

## After registration

Token tax is due annually — pay it through e-Pay to avoid a penalty. Selling the car requires a transfer of ownership at Excise; keep the original book safe.`,
    faqs: [
      { question: "Can the dealer register the car for me?", answer: "Yes, most dealers offer registration as a service for a fee; the taxes are the same." },
      { question: "What is the difference between registration in Punjab and Islamabad?", answer: "Islamabad registration is handled by ICT Excise and often faster; token tax rates differ slightly." },
    ],
    sources: [{ title: "Excise, Taxation & Narcotics Control Department Punjab", url: "https://excise.punjab.gov.pk", publisher: "Government of Punjab" }],
  },
  {
    slug: "how-to-open-a-roshan-digital-account",
    category: "banking",
    title: "Roshan Digital Account: how overseas Pakistanis open one and what it offers",
    dek: "RDA lets non-resident Pakistanis open a bank account from abroad in a few days, invest in Naya Pakistan Certificates, stocks and property, and repatriate freely.",
    entities: ["sbp", "meezan-bank", "hbl"],
    body: `## Who can open one

Non-resident Pakistanis (NRPs) and Pakistan-origin card holders, plus resident Pakistanis with assets declared abroad.

## Documents

- CNIC / NICOP / POC
- Passport
- Proof of NRP status (visa, residence permit, foreign ID)
- Proof of profession/income (job letter, payslip, bank statement)
- Live photo/selfie

## Steps

1. Choose a participating bank (all major banks: HBL, UBL, MCB, Meezan, Bank Alfalah, etc.).
2. Fill the online RDA form and upload documents.
3. The bank verifies within 48 hours and opens the account; you fund it via international transfer.

## What you can do

- **Naya Pakistan Certificates** — USD and PKR, Islamic and conventional.
- **Stocks** through a broker linked to your RDA.
- **Property** purchase with funds from the RDA, with repatriation of sale proceeds.
- **Car financing** and personal finance from some banks.
- Send money home instantly at interbank rates.

## Taxes

Profit on Naya Pakistan Certificates is subject to a final withholding tax (10%); no return filing is required for that income alone.`,
    faqs: [
      { question: "Is RDA money repatriable?", answer: "Yes. Funds and profits can be transferred back abroad without prior SBP approval." },
      { question: "Can I open RDA while in Pakistan?", answer: "The applicant must be an NRP; some banks allow application while visiting with proof of foreign residence." },
    ],
    sources: [{ title: "State Bank of Pakistan — Roshan Digital Account", url: "https://www.sbp.org.pk/RDA/", publisher: "SBP" }],
  },
  {
    slug: "how-to-renew-cnic-online-nadra",
    category: "government",
    title: "How to renew or update your CNIC online with NADRA Pak-Identity",
    dek: "Renewal, address change and marital-status updates can be done from home through Pak-Identity. New CNICs and name changes still need a NADRA centre visit.",
    entities: ["nadra"],
    body: `## What Pak-Identity can do

- Renew an expired CNIC
- Change address or marital status
- Apply for NICOP/POC (overseas)
- Request a reprint

## Steps

1. Create an account on the Pak-Identity portal or app.
2. Choose **Apply → Renewal** (or Modification).
3. Upload a photo, signature and fingerprint scans (the app captures fingerprints on supported phones).
4. Add a family member's CNIC as a verifier if asked.
5. Pay online (fees vary by delivery speed: Normal, Urgent, Executive).
6. Track status; the card is delivered by courier.

## Fees (indicative)

Normal delivery is the cheapest; Executive is roughly triple. Fees are shown at checkout.

## When you must visit a centre

First-time CNIC, changes to name, date of birth, gender or father's name, and biometric re-capture. Book a slot to avoid queues.`,
    faqs: [
      { question: "How long does online renewal take?", answer: "Normal: about 30 days; Urgent: 7–15 days; Executive: 3–7 days, plus courier time." },
      { question: "Can I keep using an expired CNIC?", answer: "Banks and NADRA verification will fail on an expired card. Renew before travel or transactions." },
    ],
    sources: [{ title: "NADRA — Pak-Identity", url: "https://id.nadra.gov.pk", publisher: "NADRA" }],
  },
  {
    slug: "how-to-register-a-company-with-secp",
    category: "business",
    title: "How to register a private limited company with SECP (eZfile)",
    dek: "Incorporation is fully online, costs a few thousand rupees, and typically completes in 1–3 working days.",
    entities: ["secp", "fbr"],
    body: `## Choose the structure

- **Sole proprietorship** — no SECP registration; just NTN and a bank account.
- **Private Limited (Pvt) Ltd** — most common for startups and SMEs; limited liability; 1+ directors.
- **SMC** — single-member company.
- **LLP** — partnership with limited liability.

## Steps for a Pvt Ltd

1. **Name reservation** on eZfile — check availability, pay the fee; approval within a day.
2. **Incorporation form** — directors' details, share capital, registered address, principal business.
3. Upload CNICs, a Memorandum & Articles (templates provided), and pay incorporation fees (based on authorised capital).
4. Certificate of Incorporation is issued digitally.
5. **NTN** is generated automatically and shared with FBR; register on IRIS to file returns.
6. Open a company bank account with the certificate, NTN and board resolution.

## Ongoing compliance

- Annual return (Form A) and financial statements to SECP.
- Income tax return and, if applicable, sales tax returns to FBR.
- Provincial sales tax on services (PRA/SRB/KPRA) if you provide services.`,
    faqs: [
      { question: "How much does company registration cost?", answer: "Name reservation and incorporation fees together are typically Rs 3,000–10,000 for small authorised capital through eZfile." },
      { question: "Do I need a lawyer?", answer: "Not for a standard Pvt Ltd; eZfile templates are sufficient. Complex shareholding or foreign directors benefit from professional help." },
    ],
    sources: [{ title: "SECP — eZfile", url: "https://ezfile.secp.gov.pk", publisher: "SECP" }],
  },
  {
    slug: "fbr-iris-login-registration-and-filing-guide",
    category: "taxes",
    title: "FBR IRIS: login, registration and filing your return — the complete guide",
    dek: "IRIS is FBR's online portal for NTN registration, income tax returns, wealth statements and notices. Here is how to log in, what each menu does, and how to fix the errors everyone hits.",
    featured: true,
    entities: ["fbr", "income-tax"],
    body: `## What IRIS is

**IRIS** (iris.fbr.gov.pk) is the Federal Board of Revenue's self-service portal. Everything an individual taxpayer does with FBR happens here: registering for an NTN, filing the annual income tax return and wealth statement, replying to notices, applying for refunds, and checking withholding certificates.

## Summary

| | |
|---|---|
| **Portal** | iris.fbr.gov.pk |
| **Login** | Registration number (your CNIC for individuals) + password |
| **Cost** | Free |
| **Mobile app** | Tax Asaan (Android/iOS) covers registration, ATL check and simplified returns |

## FBR IRIS login

1. Go to **iris.fbr.gov.pk** and click **Login**.
2. Enter your **Registration No.** — for individuals this is your 13-digit CNIC without dashes — and your password.
3. Complete the captcha. On first login after registration you will be asked to change the password.

**Forgot password?** Use *Forgot Password* on the login screen. Codes are sent to the mobile number and email on your registration — both must still be in your name and active.

## Registration on IRIS (first time)

1. Choose **Registration for Unregistered Person**.
2. Enter CNIC, full name as per CNIC, a mobile number registered in your own name, and an email.
3. Enter the verification codes sent by SMS and email.
4. Set a password. Your NTN is now your CNIC.
5. Log in and complete **Form 181** (Registration) — address, employer or business, bank account. Without Form 181 the registration stays incomplete.

## The IRIS menus that matter

- **Registration → Form 181** — your profile. Update it when you change job, address or bank.
- **Declaration → 114(1) Return of Income** — the annual return. Choose the tax year (e.g. 2026 for income earned July 2025 – June 2026).
- **Declaration → 116(2) Wealth Statement** — assets and liabilities; required with the return for individuals.
- **Inbox** — notices from FBR (e.g. 114(4) for non-filing, 122 for audit). Replies are filed from here with a deadline shown.
- **Refund → 170** — apply for a refund of excess withholding.
- **MIS → Withholding Statements / Tax Deducted** — see what employers, banks and others have reported deducting from you. Use it to reconcile before filing.

## Filing a salaried return in IRIS

1. Open **114(1)** for the year; IRIS pre-fills some withholding from MIS.
2. **Salary**: enter total gross salary; tax deducted appears under *Adjustable tax → Salary u/s 149*.
3. Add other income (profit on debt, rental, capital gains) and the tax withheld on each.
4. Add adjustable withholdings you paid during the year (mobile, vehicle token, property, cash withdrawal).
5. IRIS computes the tax — compare with the [Income Tax Calculator](/tools/tax/income-tax-calculator).
6. Complete the **Wealth Statement** and its reconciliation.
7. **Verify** with the PIN sent to your mobile, then **Submit**. Download the acknowledgement.

## Common IRIS errors and fixes

- **"Mobile number already registered"** — the number is tied to another CNIC; get it re-registered in your name with your operator first.
- **"Form 181 pending"** — open Registration and submit the form; the return option stays greyed out until then.
- **Wealth reconciliation does not balance** — every rupee of increase in net assets must be explained by income, gifts, loans or inheritance. Check bank balances at 30 June, not today.
- **Session timeout** — IRIS logs out after inactivity; save each tab as you go.
- **Cannot see 2026 return** — returns open after the FBR notification for the year; late July onward.

## Deadlines and the ATL

Individuals file by **30 September** (extensions are announced most years). Filing puts you on the **Active Taxpayer List**; check it via SMS *ATL space CNIC* to **9966** or on the FBR website. Late filers pay Rs 1,000 to be added to the ATL.`,
    faqs: [
      { question: "What is my FBR IRIS registration number?", answer: "For individuals it is your 13-digit CNIC without dashes. For companies and AOPs it is the 7-digit NTN issued at registration." },
      { question: "Is IRIS the same as Tax Asaan?", answer: "Tax Asaan is FBR's mobile app that covers registration, ATL check and simplified returns. Full returns, wealth statements and notices are handled on the IRIS web portal." },
      { question: "Can I change my email or mobile number on IRIS?", answer: "Yes — under Registration → Form 181 → Modify. The new number must be registered in your own name." },
      { question: "How do I reply to an FBR notice?", answer: "Open Inbox, select the notice, and use Reply. Attach documents as PDF. The deadline is shown on the notice; you can request an extension from the same screen." },
      { question: "Why does IRIS show tax deducted that I did not know about?", answer: "Banks, mobile operators and employers report withholding to FBR under your CNIC. MIS shows these; claim them in your return so they reduce your liability or create a refund." },
    ],
    sources: [
      { title: "FBR IRIS portal", url: "https://iris.fbr.gov.pk", publisher: "Federal Board of Revenue" },
      { title: "Income Tax Ordinance 2001 — sections 114, 116, 149", publisher: "FBR" },
    ],
  },
  {
    slug: "how-to-check-filer-status-atl-pakistan",
    category: "taxes",
    title: "How to check filer status in Pakistan: ATL check by SMS, online and by NTN",
    dek: "Your filer status decides whether you pay the normal or the doubled withholding rate. Checking it takes ten seconds by SMS or on the FBR website.",
    entities: ["fbr", "income-tax"],
    body: `## Three ways to check the Active Taxpayer List

### 1. By SMS (fastest)
Send **ATL (space) 13-digit CNIC** to **9966**. The reply says *Active* or *Inactive* with the date. For a company or AOP, send **ATL (space) 7-digit NTN**.

### 2. Online
Open the FBR website → **Online Verifications → Active Taxpayer List (Income Tax)**. Enter the CNIC or NTN, the captcha, and check. The result shows the name, registration number and status.

### 3. Download the full list
FBR publishes the complete ATL as a downloadable file every Monday. Useful for businesses that need to verify many vendors at once.

## What "filer" and "non-filer" mean

A **filer** is a person whose name appears on the ATL because they filed the return for the latest tax year (or paid the surcharge to be added). A **non-filer** pays higher withholding rates under the Tenth Schedule — roughly double on vehicle registration, property transactions, bank profit and more. See [what non-filers pay extra](/news/economy/filer-vs-non-filer-what-you-pay-extra-on-cars-property-and-bank-transactions).

## Why you might show as inactive

- You registered on IRIS but never submitted a return.
- You filed after the deadline and did not pay the Rs 1,000 ATL surcharge.
- The ATL updates weekly; a return filed on Tuesday appears the following Monday.
- The new tax year's ATL replaced the old one (published 1 March each year) and you have not filed for the new year yet.

## How to become active

File the return for the latest tax year on IRIS — the [step-by-step guide](/guides/taxes/how-to-file-income-tax-return-pakistan) — or, if the deadline has passed, file and pay the surcharge through a PSID generated in IRIS. Status updates on the next Monday.

## Checking someone else's status

Businesses routinely check vendors and buyers before applying withholding. The SMS and web checks work for any CNIC or NTN; no login is required.`,
    faqs: [
      { question: "How do I check filer status by CNIC?", answer: "SMS 'ATL <CNIC>' to 9966, or use Online Verifications → Active Taxpayer List on the FBR website. Both are free." },
      { question: "What is the difference between ATL and NTN?", answer: "An NTN is your registration number with FBR (your CNIC for individuals). The ATL is the list of registered people who actually filed the latest return — only those on it are filers." },
      { question: "How long after filing does the ATL update?", answer: "The list is refreshed every Monday. File by Sunday to appear on Monday's list." },
      { question: "I filed last year — why am I a non-filer now?", answer: "A new ATL based on the latest tax year is published every 1 March. You must file each year to stay active." },
    ],
    sources: [
      { title: "FBR — Active Taxpayer List", url: "https://fbr.gov.pk", publisher: "Federal Board of Revenue" },
      { title: "Income Tax Ordinance 2001 — section 182A and Tenth Schedule", publisher: "FBR" },
    ],
  },
];
