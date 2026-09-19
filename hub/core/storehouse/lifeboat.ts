/**
 * The Lifeboat: hardship and get-out-of-debt support, not bankruptcy.
 * Plain descriptions, what to say on the phone, and what to avoid. General
 * US information as of 2026; program terms change, so the app says to
 * confirm details when you call.
 */
export interface Resource {
  key: string;
  title: string;
  who: string;
  what: string;
  how: string;
  script?: string;
  contact?: string;
}

export const RESOURCES: Resource[] = [
  {
    key: "counseling",
    title: "Nonprofit credit counseling and a debt management plan",
    who: "Anyone with credit card or personal-loan debt they can't consolidate.",
    what: "A free review of everything, and a plan where your cards are paid through one monthly payment, usually at reduced interest. No loan, no credit check. Most creditors work with these agencies.",
    how: "Call an agency in the National Foundation for Credit Counseling network, or find one at nfcc.org. Ask for a free counseling session first; decide about a plan after.",
    contact: "800-388-2227",
    script: "I'd like a free counseling session. We have several cards and loans we're paying minimums on, we were turned down for consolidation, and I want to see what a debt management plan would look like.",
  },
  {
    key: "hardship",
    title: "The lender's own hardship program",
    who: "Every card and most loans. You have to ask; they don't offer.",
    what: "A lower rate or payment for a set stretch, often six to twelve months, while you keep paying. Sometimes a settled amount if you're far behind.",
    how: "Call the number on the back of the card. Ask for the hardship department by name. Write down who you spoke to and what they offered, and put it in the debt's call log here.",
    script: "I'm calling to ask about your hardship program. Our income changed and I want to keep paying this account. What options do you have for a reduced rate or payment?",
  },
  {
    key: "medical",
    title: "Hospital financial assistance",
    who: "Any medical bill, before it goes to a card or a collector.",
    what: "Nonprofit hospitals must offer financial assistance, often a large reduction or a zero-interest plan. Itemized bills also get corrected more often than you'd think.",
    how: "Ask the billing office for their financial assistance application and an itemized bill. Apply even if you think you earn too much.",
    script: "I'd like to apply for financial assistance on this bill, and I'd like an itemized statement before I pay anything.",
  },
  {
    key: "student",
    title: "Student loans: income-driven repayment and hardship deferment",
    who: "Federal student loans.",
    what: "Payments set by income, which can be very low, and pauses for hardship.",
    how: "Sign in at studentaid.gov and look for repayment options, or call your servicer. Don't pay a company to do this; it's free.",
  },
  {
    key: "cash",
    title: "Freeing up cash while it's tight",
    who: "Anyone. None of it is shameful; it's what the programs are for.",
    what: "Utility assistance (LIHEAP), food assistance (SNAP), local help through 211, and church benevolence funds. Each one frees dollars for the debts.",
    how: "Dial 211 and say what you need. Ask a church you trust whether they have a benevolence fund; most do and few people ask.",
    contact: "211",
  },
  {
    key: "collectors",
    title: "Collectors, and your rights",
    who: "Any debt that's been sent to a collection agency.",
    what: "Under the Fair Debt Collection Practices Act they can't call at all hours, threaten, or lie. You can demand written proof of the debt, and they must stop until they provide it.",
    how: "Send a written debt validation request within 30 days of first contact. Keep every letter. Complaints go to the Consumer Financial Protection Bureau at consumerfinance.gov.",
    script: "Please send written validation of this debt, including the original creditor and the amount. Until then, please contact me only in writing.",
  },
  {
    key: "creditUnion",
    title: "A credit union's small loan",
    who: "When one small high-rate debt needs replacing and a bank said no.",
    what: "Credit unions offer payday-alternative loans and small personal loans with looser credit rules than banks.",
    how: "Join a local credit union, sit with a loan officer, and bring your Storehouse debt list. They can see the whole picture.",
  },
];

export const AVOID: string[] = [
  "For-profit debt settlement companies. They tell you to stop paying, take fees, and your credit takes the hit while they negotiate.",
  "Payday loans and title loans. The rate makes every other debt look cheap.",
  "Anyone who promises to erase debt or fix credit for a fee. Everything real is free or nonprofit.",
  "Paying a card with another card, unless it's a true zero-interest transfer you can finish before the rate returns.",
];

export const REBUILDING: string[] = [
  "Pay every account on time, even the minimum. On-time payments are most of a credit score, and twelve to twenty-four months of them rebuild it.",
  "Keep the oldest card open, even at zero balance.",
  "A secured card from a credit union: a small deposit becomes the limit. Use it for gas, pay it in full monthly.",
  "Check all three reports free at annualcreditreport.com and dispute anything wrong in writing.",
  "Ask for credit-limit increases only after six on-time months; never open several new accounts at once.",
  "Watch the number once a quarter, not once a day. It moves slowly and that's normal.",
];
