/**
 * Where to go for low-cost or free care in the US. Every link is a real
 * national finder; the zip code, when the person saves one, narrows the
 * ones that take it. Costs are what these programs are built to be, not a
 * promise about a particular clinic.
 */
export interface Resource {
  name: string;
  what: string;
  cost: string;
  how: string;
  url: (zip: string | null) => string;
  group: "care" | "urgent" | "medicine" | "mental" | "money" | "dental";
}

export const RESOURCES: Resource[] = [
  { group: "care", name: "Community health centers (FQHCs)", what: "Federally funded clinics: primary care, women's health, often dental, pharmacy and counseling, for anyone, insured or not.", cost: "Sliding scale by income; nobody is turned away for inability to pay.", how: "Find the nearest one, call, and say you'd like to be seen on the sliding scale. Bring proof of income if you have it; they'll see you either way.", url: (zip) => (zip ? `https://findahealthcenter.hrsa.gov/?zip=${encodeURIComponent(zip)}&radius=25` : "https://findahealthcenter.hrsa.gov/") },
  { group: "care", name: "Free and charitable clinics", what: "Volunteer-run clinics, often evenings, for people without coverage.", cost: "Free or a small donation.", how: "Search by state; call ahead, many take walk-ins on set days.", url: () => "https://nafcclinics.org/find-clinic/" },
  { group: "care", name: "Hill-Burton and hospital financial assistance", what: "Every nonprofit hospital must have a financial assistance (charity care) policy. Many wipe or cut bills for households under 2 to 4 times the poverty line.", cost: "Free or reduced, after the fact too: you can apply after a bill arrives.", how: "Ask the billing office for the financial assistance application. Do this for any ER or ultrasound bill, even months later.", url: () => "https://www.hrsa.gov/get-health-care/affordable/hill-burton" },
  { group: "care", name: "2-1-1", what: "The local line for everything: clinics, food, utilities, rides to appointments.", cost: "Free.", how: "Dial 211, or search online by zip.", url: (zip) => (zip ? `https://www.211.org/get-help/search?zip=${encodeURIComponent(zip)}` : "https://www.211.org/") },
  { group: "care", name: "Planned Parenthood", what: "Women's health, not only reproductive: exams, infections, hormones, some primary care.", cost: "Sliding scale; often free with state programs.", how: "Book online; ask about the sliding fee when booking.", url: (zip) => (zip ? `https://www.plannedparenthood.org/health-center?location=${encodeURIComponent(zip)}` : "https://www.plannedparenthood.org/health-center") },
  { group: "urgent", name: "Urgent care, self-pay", what: "For the 'today' things that aren't 'now': a calf ultrasound referral, an infection, a joint that needs looking at.", cost: "Usually far less than an ER. Ask the self-pay price before you're seen; many post it.", how: "Search 'urgent care near me' and call to ask the self-pay visit price and whether they can order an ultrasound or send you straight for one.", url: (zip) => `https://www.google.com/maps/search/urgent+care+self+pay+near+${encodeURIComponent(zip ?? "me")}` },
  { group: "urgent", name: "The ER, and the bill after", what: "For the 'now' things. Go. The bill is a later problem with a solution: financial assistance above, and itemized-bill review.", cost: "High, then often reduced or forgiven on application.", how: "Say plainly what's happening. Afterward, request an itemized bill and the financial assistance form.", url: () => "https://www.hrsa.gov/get-health-care/affordable/hill-burton" },
  { group: "medicine", name: "Cost Plus Drugs", what: "Generic medications at cost plus a small markup, by mail.", cost: "Often a few dollars a month.", how: "Search the medication; your prescriber sends the script there.", url: () => "https://costplusdrugs.com/" },
  { group: "medicine", name: "GoodRx", what: "Coupons that beat the cash price at most pharmacies.", cost: "Free to use.", how: "Search the medication, show the coupon at the counter.", url: () => "https://www.goodrx.com/" },
  { group: "medicine", name: "NeedyMeds and patient assistance", what: "Manufacturer programs that give brand-name medications free or nearly free to people under income limits.", cost: "Free to apply.", how: "Search the drug name; the site lists the program and the form.", url: () => "https://www.needymeds.org/" },
  { group: "mental", name: "Open Path Collective", what: "Therapists who see people at a set low rate, in person and online.", cost: "$40 to $80 a session (one-time membership fee).", how: "Search by zip and filter for trauma or somatic work.", url: () => "https://openpathcollective.org/" },
  { group: "mental", name: "Community mental health centers", what: "County-funded counseling and psychiatry.", cost: "Sliding scale.", how: "2-1-1 knows which one covers your county.", url: (zip) => (zip ? `https://findtreatment.gov/locator?sAddr=${encodeURIComponent(zip)}` : "https://findtreatment.gov/") },
  { group: "mental", name: "988", what: "Crisis line, call or text, 24 hours.", cost: "Free.", how: "Call or text 988.", url: () => "https://988lifeline.org/" },
  { group: "money", name: "Medicaid", what: "Free coverage for adults under the income limit in expansion states; children and pregnant women almost everywhere.", cost: "Free.", how: "Apply through the state site; a health center's enrollment worker will do it with you for free.", url: () => "https://www.healthcare.gov/medicaid-chip/getting-medicaid-chip/" },
  { group: "money", name: "Marketplace (ACA) plans", what: "Coverage with subsidies that can bring premiums near zero for lower incomes.", cost: "Depends on income; enrollment workers at health centers help for free.", how: "Check your estimate; special enrollment opens with a life change, and open enrollment runs November to January.", url: () => "https://www.healthcare.gov/" },
  { group: "money", name: "Medical bill help: Dollar For", what: "A nonprofit that files hospital charity-care applications for you.", cost: "Free.", how: "Enter the hospital and household size; they tell you if you qualify and file it.", url: () => "https://dollarfor.org/" },
  { group: "dental", name: "Dental schools", what: "Supervised student dentists doing full care.", cost: "A fraction of private prices.", how: "Call the nearest school's patient clinic; waits are long, so call early.", url: () => "https://www.ada.org/resources/careers/dental-schools" },
  { group: "dental", name: "Health center dental", what: "Many community health centers have dental chairs.", cost: "Sliding scale.", how: "Same finder as the health centers; filter for dental.", url: (zip) => (zip ? `https://findahealthcenter.hrsa.gov/?zip=${encodeURIComponent(zip)}&radius=25` : "https://findahealthcenter.hrsa.gov/") },
];

export const GROUP_LABEL: Record<Resource["group"], string> = {
  urgent: "For today, and for now",
  care: "Ongoing care, low cost or free",
  medicine: "Medications",
  mental: "Counseling and crisis",
  money: "Coverage and bills",
  dental: "Dental",
};
