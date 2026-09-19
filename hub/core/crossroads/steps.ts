/**
 * The Road: the steps, in order, for each path. Details and costs are
 * 2026 US figures Claude is fairly sure of; each step names where to
 * confirm. Steps can be checked, assigned, and noted per person.
 */
export type Path = "abroad" | "domestic";

export interface Step {
  key: string;
  stage: string;
  title: string;
  details: string;
  cost?: string;
  time?: string;
  where?: string;
  paths: Path[];
}

export const STAGES = ["Decide", "Papers", "Money", "Health and pets", "Work", "Home", "The move", "Landing"];

export const STEPS: Step[] = [
  { key: "decide", stage: "Decide", title: "Answer the questions, both of you, and read the Together page", details: "Where you match, where you differ, and what each of you can't live without. Nothing else in this plan works until this is honest.", paths: ["abroad", "domestic"] },
  { key: "shortlist", stage: "Decide", title: "Pick three places to look at seriously", details: "From the Places page, with fit scores, plus your own gut. Three, not ten.", paths: ["abroad", "domestic"] },
  { key: "visit", stage: "Decide", title: "Visit the top one for at least two weeks, in the off season", details: "Rent an apartment, not a hotel. Go to church. Buy groceries. Take the bus. Talk to people who live there.", cost: "Flights and a month's rent, roughly $3,000 to $6,000 for two", time: "2 to 4 weeks", paths: ["abroad", "domestic"] },
  { key: "passports", stage: "Papers", title: "Passports, both of you", details: "A first adult passport book is applied for in person with Form DS-11 at a post office or county office; a renewal is by mail with DS-82. Bring a birth certificate, a driver's license, and a passport photo. Processing is usually four to six weeks; expedited is faster for a fee.", cost: "$130 application plus a $35 acceptance fee for a first passport; $130 for a renewal; expedited adds $60", time: "4 to 6 weeks, or 2 to 3 expedited", where: "travel.state.gov, then a passport acceptance facility near you", paths: ["abroad"] },
  { key: "visaResearch", stage: "Papers", title: "Confirm the visa that applies to you", details: "Read the consulate's page for the visa named on your place's card. Write down the income threshold, the documents, the fee, and the appointment process. Thresholds change yearly.", where: "The country's consulate website", paths: ["abroad"] },
  { key: "fbi", stage: "Papers", title: "FBI background check, apostilled", details: "Most residency visas need an FBI Identity History Summary less than six months old. Request it online with fingerprints from an approved channeler, then get it apostilled by the US State Department.", cost: "$18 for the check; channelers charge more for speed; $20 per document for the apostille", time: "2 to 8 weeks total", where: "fbi.gov, then travel.state.gov for authentications", paths: ["abroad"] },
  { key: "vitalRecords", stage: "Papers", title: "Birth and marriage certificates, certified and apostilled", details: "Order certified copies from the state where each was issued, then have them apostilled by that state's Secretary of State. Some countries want translations too.", cost: "$10 to $30 per copy; $5 to $20 per apostille by state", time: "2 to 6 weeks", where: "The issuing state's vital records office, then its Secretary of State", paths: ["abroad"] },
  { key: "license", stage: "Papers", title: "International driving permit, and a plan for a local license", details: "An International Driving Permit from AAA covers you for a while; most countries require a local license within six to twelve months.", cost: "$20 at AAA", where: "AAA", paths: ["abroad"] },
  { key: "domesticId", stage: "Papers", title: "New driver's license, registration, and voter registration", details: "Most states give you 30 to 90 days after you move. Bring proof of address and your old license.", cost: "$20 to $60", where: "The new state's DMV", paths: ["domestic"] },
  { key: "proofIncome", stage: "Money", title: "Proof of income and savings the visa asks for", details: "Bank statements, business income, contracts. Most remote-work visas want a monthly income of two to four times the local minimum wage and several months of statements.", where: "Your bank, your accountant", paths: ["abroad"] },
  { key: "taxes", stage: "Money", title: "Talk to an expat tax preparer before you go", details: "US citizens file US taxes wherever they live. The foreign earned income exclusion, foreign tax credits, and FBAR reports on foreign accounts over $10,000 all matter. One hour with a specialist saves a year of trouble.", cost: "$200 to $500 for a consultation", where: "An expat tax specialist", paths: ["abroad"] },
  { key: "bank", stage: "Money", title: "Keep one US bank and one US credit card open; plan a local account", details: "Many US banks close accounts with foreign addresses; use a family address or a bank that serves expats. Wise or similar for transfers.", paths: ["abroad"] },
  { key: "storehouse", stage: "Money", title: "Run the move through The Storehouse", details: "A Barn for the move itself, and a Sit-Down that shows what the first six months cost. Debts don't disappear when you leave; make the plan for them first.", where: "The Storehouse", paths: ["abroad", "domestic"] },
  { key: "insurance", stage: "Health and pets", title: "Health insurance that works from day one", details: "Most visas require private coverage at first; public systems come after residency. Compare international plans and local private plans.", cost: "$100 to $400 a month for two, varies widely", paths: ["abroad"] },
  { key: "records", stage: "Health and pets", title: "Medical records, prescriptions, and a supply", details: "Get records and a letter for any ongoing medications with generic names. Bring a 90-day supply where the airline and country allow.", paths: ["abroad", "domestic"] },
  { key: "pets", stage: "Health and pets", title: "Pets: microchip, rabies, USDA endorsement", details: "Most countries require an ISO microchip, a rabies shot after the chip, a health certificate within ten days of travel endorsed by USDA APHIS, and for some a rabies titer test months ahead. Start early.", cost: "$150 to $600 per pet, more with a titer test", time: "Start 4 to 6 months ahead", where: "Your vet, then aphis.usda.gov", paths: ["abroad"] },
  { key: "business", stage: "Work", title: "John's business: licensing, clients, and time zones", details: "Financial and insurance licenses are state-based; confirm what can be kept remotely and what a move ends. Tell clients early. Pick working hours that overlap with US time.", where: "State insurance department, licensing board", paths: ["abroad", "domestic"] },
  { key: "remote", stage: "Work", title: "Confirm remote work is allowed on your visa", details: "Digital nomad visas allow work for foreign clients only. Working for local clients usually needs a different permit.", paths: ["abroad"] },
  { key: "church", stage: "Home", title: "Find a church and a community before you find a house", details: "Write to two or three churches in the town. Ask what English-speaking fellowship exists. Community is what makes a place home; find it first.", paths: ["abroad", "domestic"] },
  { key: "housing", stage: "Home", title: "Rent for a year before buying anything", details: "Renting first is the rule every expat repeats. Long-term rentals are found locally, not on vacation sites; a local agent or a Facebook group for the town helps.", paths: ["abroad", "domestic"] },
  { key: "sell", stage: "The move", title: "Sell, store, or ship: decide per room", details: "Shipping a household abroad costs more than replacing most of it. Take what has meaning and what's hard to buy; sell the rest.", cost: "$4,000 to $12,000 to ship a household by sea; far less to bring suitcases and buy there", paths: ["abroad"] },
  { key: "movers", stage: "The move", title: "Movers or a truck, and the date", details: "Get three quotes. Move mid-month and mid-week for lower rates.", cost: "$2,000 to $8,000 for an interstate move", paths: ["domestic"] },
  { key: "mail", stage: "The move", title: "Mail forwarding, phone, and subscriptions", details: "A virtual mailbox service scans your mail. Keep a US phone number on an inexpensive plan for banks and two-factor codes.", cost: "$10 to $30 a month for a mailbox; $10 to $25 for the number", paths: ["abroad"] },
  { key: "goodbyes", stage: "The move", title: "Goodbyes, done on purpose", details: "A last dinner with each person who matters. Grief is part of a good move, and rushing it makes landing harder.", paths: ["abroad", "domestic"] },
  { key: "arrive", stage: "Landing", title: "Register, get the residence card, open the local account", details: "Most countries require registering your address and applying for the residence card within days or weeks of arrival. Do it in the first week.", paths: ["abroad"] },
  { key: "language", stage: "Landing", title: "Language classes, in person, in the first month", details: "Classes are where you meet people. Ninety days of daily practice changes everything.", paths: ["abroad"] },
  { key: "review", stage: "Landing", title: "A Sit-Down at three months, and at one year", details: "What's true, what's hard, what you'd change. Deciding to stay is also a decision, made on purpose.", where: "The Storehouse and Tend's Together", paths: ["abroad", "domestic"] },
];
