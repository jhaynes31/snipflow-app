// The topic bank behind every content generator (scripts, carousels, social
// cards, memes, b roll, campaigns).
//
// One block per topic, four layers each:
//   facts       what is true about this topic in 2026, in plain English.
//               The roll picks one and the AI builds the content around it.
//   painPoints  the viewer's own situation, in the words they would use.
//               John picks one and the content must speak to it directly.
//   stats       sourced figures (Stat Cards lead with one). Every number here
//               traces to docs/content-sources.md. Hedge with "about" where
//               the source is a survey; never add a figure without a source.
//   moves       practical tips, tricks, and life hacks the viewer can actually
//               do this week. The prompt hands the AI one or two per piece.
//
// Style rules for this file: no em dashes, no hyphens inside the text, no
// double quotes inside the text, no contractions, no shame, no guarantees,
// no investment picks. Rewritten in 2026 to retire the Dave Ramsey era
// advice (latte math, 50/30/20, three to six months first, 10 to 12 times
// income) in favor of the economy the viewer actually lives in.

export interface TopicEntry {
  facts: string[];
  painPoints: string[];
  stats: string[];
  moves: string[];
}

export const TOPIC_BANK: Record<string, TopicEntry> = {
  // ── Money right now ───────────────────────────────────────────────
  "Paycheck to Paycheck": {
    facts: [
      "Living paycheck to paycheck is now the majority experience in America, not a sign that someone did something wrong.",
      "Surveys in 2026 put roughly two thirds of US adults in the paycheck to paycheck group, and about a quarter of those are struggling to pay basic bills.",
      "Housing and transportation alone take about half of the average household's spending, before food, childcare, or debt.",
      "When fixed costs eat most of a paycheck, a budget cannot create money that is not there; it can only show where the squeeze is.",
      "The most common surprise expenses are car repairs, home or appliance repairs, and medical bills, and most adults hit at least one every year.",
      "Timing matters as much as amount: a bill that lands two days before payday causes an overdraft that the same bill two days later would not.",
      "Many utilities, lenders, and landlords will move a due date if asked, and lining up due dates with paydays is a free fix.",
      "Paycheck to paycheck is not only a low income problem; plenty of households earning six figures spend everything that comes in because their fixed costs grew with their pay.",
    ],
    painPoints: [
      "My whole check is gone the day after it lands",
      "I make more than I used to and I am still broke every month",
      "One car repair and the whole month collapses",
      "Everyone online says budget harder, but there is nothing left to cut",
    ],
    stats: [
      "A January 2026 PYMNTS survey found about two thirds of US consumers living paycheck to paycheck, with about 24% struggling to pay their bills.",
      "In the Federal Reserve's 2025 household survey, 59% of adults had at least one major unexpected expense in the past year, most often a car repair.",
      "Bank of America Institute data for 2025 found about 24% of households spending more than 95% of their income on necessities.",
    ],
    moves: [
      "Write every due date and every payday on one page, then call and move the due dates that land in the wrong week. Most billers will do it over the phone.",
      "Split the month into two pay periods and assign each bill to one of them, so neither check gets ambushed.",
      "Ask your landlord, utility, or lender about a hardship or budget billing plan before you miss a payment, not after. The options are better while the account is current.",
      "Set up a low balance alert on your checking account so an overdraft becomes a choice, not a surprise.",
      "If a check is always short, name the one fixed cost that grew the most in the last three years. That is the lever, not the coffee.",
    ],
  },

  "Credit Card Interest": {
    facts: [
      "Credit card interest rates in 2026 are near the highest levels since the Federal Reserve started tracking them.",
      "The average rate on cards that carry a balance has been running around 21% to 22% in 2026, compared with about 17% in 2019.",
      "New cards opened recently carry even higher rates, with an average above 27% on general purpose cards opened in 2024, per the CFPB.",
      "Card interest is figured daily, so the balance on the statement is already growing before the next payment posts.",
      "Paying the full statement balance by the due date each month means paying no interest at all on purchases, whatever the card's rate.",
      "Carrying a balance for a long time has become normal: a majority of people with card debt have carried it for a year or more.",
      "Card companies can and do lower rates for customers who ask, especially those with on time payment history and a competing offer in hand.",
      "A balance transfer card can pause interest for a year or more, usually for a one time fee of 3% to 5% of the amount moved.",
      "The $8 cap on late fees that the CFPB finalized in 2024 was struck down in court in April 2025, so late fees of around $30 and up are still common.",
    ],
    painPoints: [
      "I pay every month and the balance barely moves",
      "I do not even know what rate my cards charge",
      "I feel like the card company is winning and I cannot see how",
      "I got hit with a late fee that cost more than the thing I bought",
    ],
    stats: [
      "Federal Reserve data show the average rate on credit cards carrying a balance ran about 21% to 22% in 2026, versus about 17% in 2019.",
      "The CFPB found the average rate on new general purpose cards opened in 2024 was 27.5%, compared with 19.8% ten years earlier.",
      "Bankrate's 2026 survey found 47% of cardholders carry a balance month to month, and 61% of those have carried it for at least a year.",
      "A $5,000 balance at 22% costs about $1,100 a year in interest alone if the balance never drops.",
    ],
    moves: [
      "Find the APR on each card's statement and write them down highest to lowest. Most people have never seen the number. That list is your battle order.",
      "Call the number on the back of the card and say: I have been a customer for years, I pay on time, and I have an offer at a lower rate. Can you lower my APR? Many issuers say yes.",
      "Pay something the day you get paid instead of waiting for the due date. Interest is figured daily, so an early payment shrinks the balance it is charged on.",
      "If your credit is fair or better, look at a 0% balance transfer card and do the math on the fee. Moving $4,000 for a 3% fee costs $120 and can save more than $800 in a year.",
      "Turn on autopay for at least the minimum so a late fee and a penalty rate never happen by accident, then pay extra by hand.",
    ],
  },

  "The Minimum Payment Trap": {
    facts: [
      "The minimum payment on most cards is about 1% of the balance plus that month's interest, which is designed to keep the account open for years, not to pay it off.",
      "Paying only the minimum on a typical balance can take close to two decades to clear and cost more in interest than the original purchases.",
      "Every statement is required by law to show how long the balance takes to pay off at the minimum and what a three year payoff would cost each month.",
      "In 2024 the share of cardholders making only the minimum at some point in the year reached its highest level in at least a decade, per the CFPB.",
      "Minimum payments shrink as the balance shrinks, so a fixed payment amount, even a small one, beats the minimum every time.",
      "Minimum payments are a product design choice by the card company, not a measure of what you can afford or what you owe.",
      "Falling behind on a minimum can trigger a penalty rate and a late fee, which is why a hardship call before the missed payment is worth so much.",
    ],
    painPoints: [
      "I have paid the minimum for years and owe more than when I started",
      "The minimum is all I can manage and I feel like I am failing",
      "Nobody told me the minimum was built to keep me paying forever",
      "I do not know how much extra actually makes a difference",
    ],
    stats: [
      "A $5,000 balance at 22% paid at the typical minimum takes about 19 years and more than $8,000 in interest, versus a little over 4 years and about $2,800 at a flat $150 a month.",
      "The CFPB found 15% of general purpose cardholders and 20% of store card holders paid only the minimum at some point in 2024, the highest shares since at least 2015.",
    ],
    moves: [
      "Look at the box on your statement labeled minimum payment warning. It shows the payoff time at the minimum and the three year payment. That is the card company doing the math for you.",
      "Freeze your payment at this month's minimum amount and keep paying that exact dollar figure every month even as the minimum drops. That one habit cuts years off.",
      "Add a fixed extra you will not notice, even $20, and set it up automatically. Consistency beats a big payment once.",
      "If the minimum itself is out of reach, call the issuer and ask for the hardship program. They can lower the rate or the payment for a set period, and asking does not hurt your score.",
      "Stop using the card you are paying down. Take it out of your phone wallet and the shopping apps so new charges cannot undo the progress.",
    ],
  },

  "Buy Now Pay Later": {
    facts: [
      "Buy now pay later splits a purchase into installments, usually four payments over six weeks, often with no interest if every payment lands on time.",
      "About one in six US adults used buy now pay later in 2025, up from one in ten in 2021, per the Federal Reserve.",
      "Roughly a quarter of users were late on a payment in the past year, and about one in nine saw a buy now pay later autopay trigger an overdraft fee at their bank.",
      "Having several installment plans running at once is common and makes the total owed easy to lose track of, because each app only shows its own.",
      "Most pay in four plans still do not appear on credit reports, so they do not build credit, but missed payments can still go to collections.",
      "Buy now pay later is increasingly used for groceries and everyday bills, which means borrowing against next month's paycheck for this month's food.",
      "Returns and refunds can take longer to unwind through a buy now pay later lender than on a regular card.",
      "The protections that apply to credit cards, like dispute rights, are not guaranteed with every buy now pay later product.",
    ],
    painPoints: [
      "I have four different pay in four plans and no idea what I owe in total",
      "A $25 installment overdrew my account and cost me $35 in fees",
      "I used it for groceries and now next week's check is already spent",
      "It did not feel like debt because the app made it feel like a feature",
    ],
    stats: [
      "The Federal Reserve's 2025 household survey found 16% of adults used buy now pay later in the past year, and 11% of users had an installment trigger an overdraft or insufficient funds fee.",
      "About 1 in 4 buy now pay later users were late on a payment in the past year, according to the Federal Reserve's 2025 household survey.",
      "A 2025 CFPB study of six lenders found 63% of borrowers had more than one buy now pay later loan running at the same time in 2022.",
    ],
    moves: [
      "Open every pay later app you have, write the remaining balances on one note, and add them up. That single number is the whole point.",
      "Before you tap pay in four, say the full price out loud and ask whether you would buy it today at that price with cash. The split is a payment plan, not a discount.",
      "Match the installment dates to the week you get paid, or pay the plan off early from the app. Most let you pay ahead with no penalty.",
      "Keep buy now pay later away from groceries and bills. If this week's food needs next month's money, that is the signal to look at a hardship plan or local assistance, not another split.",
      "Turn off one tap pay later options in your most used stores so it is a decision, not a default.",
    ],
  },

  "Medical Bills": {
    facts: [
      "Medical debt is the most common kind of debt in collections in the United States, and most people who have it also have health insurance.",
      "About one in four adults reported medical debt in their family in late 2025, including about one in four people with insurance.",
      "Medical bills under $500 and any medical bill that has been paid no longer appear on credit reports from the three major bureaus, and unpaid ones get a one year wait before they can.",
      "A CFPB rule that would have removed all medical debt from credit reports was finalized in January 2025 and struck down by a federal court in July 2025, so larger unpaid bills can still be reported.",
      "Nonprofit hospitals are required by federal tax law to have a written financial assistance policy, to tell patients about it, and to screen for eligibility before suing, reporting, or selling a debt.",
      "You can ask for an itemized bill for any hospital visit, and billing errors are common enough that checking is worth the ten minutes.",
      "Most hospitals and many clinics will set up an interest free payment plan if asked, and a modest monthly amount paid consistently is usually accepted.",
      "Collectors must verify a medical debt if you dispute it in writing, and you can tell them in writing to stop contacting you.",
    ],
    painPoints: [
      "I have insurance and still got a bill I cannot pay",
      "The hospital bill is sitting in a drawer because opening it feels impossible",
      "I am scared a medical bill is going to ruin my credit",
      "I skipped the follow up appointment because the first one cost so much",
    ],
    stats: [
      "An Urban Institute survey in December 2025 found 27% of adults had medical debt in their family, including 26% of adults with health insurance.",
      "Since 2023 the three credit bureaus have left paid medical bills and unpaid medical bills under $500 off credit reports, and new unpaid medical bills wait one year before they can appear.",
      "Federal law gives patients at nonprofit hospitals at least 240 days from the first bill to apply for financial assistance, and at least 30 days notice before any collection action.",
    ],
    moves: [
      "Open the bill and ask for an itemized statement. Then ask three words: is this correct? Duplicate charges and insurance mistakes come off all the time.",
      "Search the hospital's name plus financial assistance. Nonprofit hospitals must have a program, and many forgive or discount bills for families well above the poverty line. Apply even if you have insurance.",
      "Call the billing office and offer a monthly amount you can actually keep, even $25. Ask that it be interest free. Say the words payment plan.",
      "If a bill is under $500 or already paid, it should not be on your credit report. Pull your free reports and dispute anything that breaks that rule.",
      "Never put a medical bill on a credit card to make it go away. The hospital's plan is interest free. The card is not.",
    ],
  },

  "Student Loans": {
    facts: [
      "About 42 million Americans hold federal student loans, and the total federal balance is above $1.7 trillion as of mid 2026.",
      "The pause on collections that began in 2020 ended in May 2025, when the government resumed collecting on defaulted federal loans, and millions of borrowers have fallen into default since.",
      "The SAVE repayment plan was ended by a federal court in March 2026, and borrowers who were parked in SAVE forbearance were told to choose a new plan by late September 2026.",
      "A new income based option called the Repayment Assistance Plan opened on July 1, 2026, with payments set between 1% and 10% of income and a $10 minimum.",
      "Older income driven plans were closed to new enrollment on July 1, 2026, and are scheduled to end entirely by July 2028.",
      "Wage garnishment for defaulted federal loans was announced and then delayed in early 2026, so the exact timing keeps moving and borrowers should check studentaid.gov directly.",
      "Federal loans have options private loans do not: income based payments, deferment, forbearance, and rehabilitation to get out of default.",
      "Rehabilitation lets a defaulted borrower make nine agreed payments, sometimes as low as $5 a month, to remove the default from their record.",
      "Private student loans do not qualify for federal plans, but lenders may offer hardship forbearance or a rate reduction if asked.",
    ],
    painPoints: [
      "My loan plan got cancelled and I do not understand what I am supposed to do now",
      "I have been paying for ten years and owe more than I borrowed",
      "I am terrified they are going to start taking it out of my paycheck",
      "I have not logged in since 2020 because I am afraid of what it says",
    ],
    stats: [
      "As of June 2026, about 42.3 million people held federal student loans totaling more than $1.7 trillion, per Federal Student Aid data.",
      "The Repayment Assistance Plan opened July 1, 2026 with payments of 1% to 10% of income and a $10 minimum, under the law signed July 4, 2025.",
      "Collections on defaulted federal student loans resumed May 5, 2025 after a pause that began in March 2020.",
    ],
    moves: [
      "Log in to studentaid.gov today, even if it is scary. Confirm your servicer, your plan, and your status. Nothing gets better while the account is unseen.",
      "If you were on SAVE, you need a new plan. Use the loan simulator on studentaid.gov to compare the Repayment Assistance Plan and Income Based Repayment before you pick.",
      "If you are in default, ask your servicer about rehabilitation. Nine on time payments, sized to your income, can pull the default off your record.",
      "Keep your mailing address and email current with your servicer. The garnishment notice goes to the address on file, and the 30 day window to respond starts when it is sent.",
      "Beware anyone charging a fee to fix your student loans. Every federal option is free through your servicer.",
    ],
  },

  "Car Payments": {
    facts: [
      "The average new car payment in 2026 is over $750 a month, and the average used car payment is over $500, both records.",
      "About one in five new car buyers in early 2026 signed up for a payment of $1,000 a month or more.",
      "Loan terms keep stretching: the average new car loan is about 70 months, and nearly one in four new car buyers takes 84 months or longer.",
      "Almost 30% of people trading in a car owe more than it is worth, by an average of nearly $7,000, and that gap usually gets rolled into the next loan.",
      "Rolling negative equity into a new loan means paying interest on a car you no longer own.",
      "Your credit score affects your car insurance price in most states, and a thin or poor credit file can mean paying roughly double what an excellent credit driver pays.",
      "Refinancing a car loan is possible and usually free, and credit unions often beat dealer financing by several points.",
      "A car payment plus insurance, fuel, and repairs often adds up to the second largest line in a household budget after housing.",
    ],
    painPoints: [
      "My car payment is more than my rent used to be",
      "I owe more on my car than it is worth and I cannot get out",
      "I needed a car to get to work and the only loan I could get was awful",
      "Insurance went up so much the car costs more to keep than to drive",
    ],
    stats: [
      "Experian data for the second quarter of 2026 put the average new car payment at $765 a month and the average used car payment at a record $542.",
      "Edmunds reported 20% of new car buyers in early 2026 agreed to a payment of $1,000 a month or more, and 29.6% of trade ins in mid 2026 were underwater by an average of $6,884.",
      "The average new car loan now runs about 70 months, and nearly one in four new car buyers in 2026 signed for 84 months or longer, per Edmunds.",
    ],
    moves: [
      "Check your payoff amount and your car's trade in value side by side once a year. Knowing whether you are upside down, and by how much, tells you what moves are open.",
      "If your credit has improved since you bought, apply to refinance with a credit union. A few points lower on a $25,000 loan can save well over $1,000.",
      "Shop insurance every renewal, not just when you buy. Rates moved a lot in the last three years and loyalty is rarely rewarded.",
      "If you are shopping, get a preapproval from a bank or credit union before the dealer runs your credit. It gives you a number to compare and a reason for the dealer to beat it.",
      "When the payment is crushing you, ask the lender about a modification or deferment before you miss a payment. A voluntary surrender is almost always worse than a reworked loan.",
    ],
  },

  "Rent and Housing Costs": {
    facts: [
      "Housing is the biggest expense for almost every household, and for renters it has grown faster than paychecks for most of the last six years.",
      "About half of renter households now spend more than 30% of their income on rent and utilities, and about one in four spend more than half.",
      "Typical asking rent nationally sits near $1,900 a month in 2026, with much higher figures in large metros.",
      "The median home sold for about $417,000 in late 2026, while the median household earned about $87,000, so a typical home costs close to five years of income.",
      "A household needs an income above $100,000 to afford the median home at 2026 mortgage rates, roughly $22,000 more than the median household earns.",
      "The typical first time home buyer is now 40 years old, the oldest on record, and first time buyers make up the smallest share of purchases ever recorded.",
      "Renters have rights that vary by state, including limits on fees, required notice before rent increases, and rules about security deposits.",
      "Many areas offer emergency rental assistance, utility assistance, and legal aid for tenants, and most people who qualify never apply.",
    ],
    painPoints: [
      "Rent went up again and my paycheck did not",
      "I will never afford a house and everyone keeps telling me I should buy",
      "More than half my check goes to rent and then people say save 20%",
      "I am one rent increase away from moving back in with family",
    ],
    stats: [
      "Harvard's Joint Center for Housing Studies found a record 22.7 million renter households, 49%, spent more than 30% of income on housing in 2024, and 12.1 million spent more than half.",
      "The median existing home sold for $417,500 in September 2026 per the National Association of Realtors, while the Census Bureau put median household income for 2025 at $87,460.",
      "Redfin estimated a household needed $109,796 to afford the median home in mid 2026, about $22,000 more than the median household earned.",
      "The median first time home buyer is now 40 years old and first time buyers were a record low 21% of purchases, per the 2025 National Association of Realtors profile.",
    ],
    moves: [
      "Before you renew, pull up three comparable listings in your building or neighborhood. If yours is priced above them, ask for a smaller increase in writing. Landlords would rather keep a paying tenant than carry a vacancy.",
      "Call 211 or search your county plus rental assistance. Emergency rent and utility programs exist in most areas and many sit underused.",
      "Ask your utility for budget billing so the bill is the same every month, and ask about low income rate programs if money is tight. The forms take ten minutes.",
      "If you want to buy someday, ask a lender for a free preapproval conversation now. You will learn the exact credit and savings gap instead of guessing at it, and you can walk away.",
      "Know your state's rules on fees, deposits, and notice periods. A free tenant rights guide from your state attorney general or legal aid office is worth reading once.",
    ],
  },

  "Childcare Costs": {
    facts: [
      "The average price of childcare in America is more than $13,000 a year per child, and infant care in a center costs more in most states.",
      "For a single parent at the median income, childcare for one child takes about a third of pay; for a two parent household it takes about a tenth.",
      "Care for two children costs more than the median rent in almost every state, and more than in state college tuition in most of them.",
      "Nearly one in five households says someone has quit a job because of childcare costs, and a majority of parents call it one of their top monthly expenses.",
      "A dependent care flexible spending account lets working parents pay up to $7,500 a year of childcare with pretax dollars as of 2026, if their employer offers one.",
      "The federal child and dependent care tax credit returns part of what you paid for care, and some states add their own credit on top.",
      "Childcare subsidies exist in every state and the income limits are higher than most families assume, often well above the poverty line.",
      "Many centers offer sibling discounts, sliding scale rates, or scholarships that are never advertised and only come up when a parent asks.",
    ],
    painPoints: [
      "Daycare costs more than my mortgage",
      "I did the math and it almost does not pay for me to work",
      "We have no family nearby and no backup when the center closes",
      "I feel guilty either way, working or not working",
    ],
    stats: [
      "Child Care Aware of America put the national average price of childcare at $13,184 per child in 2025, about 10% of median income for two parent households and 33% for single parents.",
      "Center based care for two children cost more than median rent in all 47 states that reported data for 2025, per Child Care Aware of America.",
      "A Third Way survey published in June 2026 found 60% of parents call childcare a top monthly expense and nearly one in five households had someone quit a job over it.",
    ],
    moves: [
      "Ask HR whether your job offers a dependent care FSA. Thousands of dollars of childcare a year can come out before taxes, which is often a four figure savings.",
      "Check your state's childcare subsidy income limit before assuming you earn too much. Search your state's name plus child care assistance and look at the chart.",
      "Ask the center director directly about sibling discounts, sliding scale fees, or scholarships. The answer is often yes and it is never on the website.",
      "Keep every childcare receipt and the provider's tax ID. The child and dependent care credit at tax time returns a share of what you paid.",
      "If a parent is considering leaving work, compare the full picture: lost retirement match, lost health coverage, and lost raises, not just the paycheck versus the daycare bill.",
    ],
  },

  "Prices vs Paychecks": {
    facts: [
      "Prices overall are up roughly 30% since the start of 2020, so a dollar buys about three quarters of what it did then.",
      "After inflation, the typical household earns only a little more than it did in 2019 even though the dollar figure on the pay stub looks much bigger.",
      "In the year to September 2026, average hourly pay rose less than prices, so the average worker lost buying power that year.",
      "The biggest price jumps since 2020 have been in the things people cannot skip: rent, insurance, electricity, and groceries.",
      "A raise below the inflation rate is a pay cut in what it buys, even though it shows up as more money.",
      "Inflation hits lower income households hardest because a bigger share of their spending goes to necessities that rose the most.",
      "Shrinkflation, smaller packages at the same price, is counted in official inflation numbers but easy to miss at the shelf.",
      "Buying power, not the dollar amount, is the right way to judge whether a raise, a benefit, or a savings balance kept up.",
    ],
    painPoints: [
      "I got a raise and I can afford less than before it",
      "My grocery bill doubled and my income did not",
      "People keep saying inflation is down but nothing got cheaper",
      "I feel crazy for struggling on a salary that used to be comfortable",
    ],
    stats: [
      "The Consumer Price Index rose 3.7% in the 12 months to September 2026, and the index is up roughly 30% since January 2020, per Bureau of Labor Statistics data.",
      "The Bureau of Labor Statistics reported real average hourly earnings fell 0.7% in the year to September 2026, meaning pay rose less than prices.",
      "Census data show real median household income hit $87,460 in 2025, only about 2.5% above its 2019 level after adjusting for inflation.",
    ],
    moves: [
      "When you get a raise, compare it with the current inflation rate before you celebrate or spend. Anything below it is standing still, and that is a fair thing to say in a review.",
      "Pick the three bills that grew the most since 2020 and attack those first: insurance quotes, phone and internet plan audits, and electricity rate programs. Those moves recover real money; skipping coffee does not.",
      "Check unit prices, not package prices, for the staples you buy every week. Shrinkflation hides in the package size.",
      "Reset any savings goal in today's dollars. A target set in 2019 buys about a quarter less now.",
      "Keep a one line record of your pay versus your rent each year. Seeing the gap on paper turns a feeling into a fact you can bring to a landlord or an employer.",
    ],
  },

  "Starting From Zero": {
    facts: [
      "A small cushion changes outcomes: research finds families with even a few hundred dollars set aside are less likely to miss a rent payment, lose utilities, or face eviction after a setback.",
      "Only about half of adults say they have three months of expenses saved, and the share has not improved in years, so starting at zero is the normal starting line.",
      "About 37% of adults could not cover a $400 surprise expense from cash or savings in 2025.",
      "The first $500 does the most work of any savings you will ever have, because it is the difference between a bill and a debt.",
      "A separate account at a different bank, with no debit card, is harder to raid than savings that sits next to checking.",
      "Saving in tiny automatic amounts right after payday works better than saving what is left at the end of the month, because nothing is left.",
      "Many employers can split direct deposit into two accounts, which makes saving invisible.",
      "Three to six months of expenses is a fine long term target, but it is a terrible first goal because it is years away for most people.",
    ],
    painPoints: [
      "I have never had more than $100 in savings in my life",
      "Every time I save something, an emergency eats it",
      "Three to six months of expenses might as well be a million dollars",
      "I feel like saving $10 is so small it is embarrassing",
    ],
    stats: [
      "The Federal Reserve's 2025 household survey found 63% of adults could cover a $400 emergency with cash or its equivalent, which leaves about 37% who could not.",
      "Bankrate's 2026 emergency savings report found 46% of Americans could cover three months of expenses from savings, and 19% had neither savings nor credit card debt.",
      "An Urban Institute study found families with $250 to $749 in savings were less likely to be evicted or miss a housing or utility payment after a setback than families with less.",
    ],
    moves: [
      "Open a separate savings account at a different bank, online is fine, and do not order a debit card for it. Friction is the feature.",
      "Ask payroll to split your direct deposit: even $15 per check to the new account. You will not miss what never lands in checking.",
      "Make the first goal $500, not three months. Celebrate it. Then set the next one at $1,000.",
      "Put windfalls to work by rule: half of any tax refund, bonus, or birthday money goes to the cushion before anything else is decided.",
      "When you use the cushion for a real emergency, that is it doing its job. Refill it without shame and keep going.",
    ],
  },

  "Where the Money Goes": {
    facts: [
      "The 50/30/20 budget assumes needs fit in half of take home pay, but for roughly a quarter of renters, rent alone takes more than half before food or transportation.",
      "Housing, transportation, and food together take about 63% of the average household's spending, so the room for cutting small pleasures is narrower than the advice suggests.",
      "Fixed costs, the bills that are the same every month, decide most of a budget; the variable spending people are told to track is usually the smaller piece.",
      "Tracking every dollar works for some people and burns out most, and a budget you quit in week three helps nobody.",
      "Looking at the last 90 days of bank and card statements once tells you more than a month of logging receipts.",
      "Subscriptions and auto renewals are the most common leak because they are designed to be forgotten.",
      "Irregular income does not make budgeting impossible; it means budgeting from the lowest recent month instead of the average.",
      "The point of knowing where the money goes is to find the one or two biggest levers, not to feel bad about every line.",
    ],
    painPoints: [
      "I tried budgeting apps and quit every single one",
      "My needs are more than 50% so the whole formula breaks for me",
      "My income is different every month and no budget fits that",
      "I know where the money goes, there just is not enough of it",
    ],
    stats: [
      "Bureau of Labor Statistics data for 2024 show housing took 33.4%, transportation 17%, and food 12.9% of the average household's spending, about 63% combined.",
      "Harvard's housing center found about 26% of renter households, 12.1 million, spent more than half of their income on housing in 2024, which breaks the 50/30/20 rule before groceries.",
    ],
    moves: [
      "Skip the app. Print or scroll the last 90 days of statements, highlight everything that repeats, and add those up. That is your real fixed cost number.",
      "Cancel or pause three recurring charges you forgot about. Then set a calendar reminder to repeat the sweep every three months.",
      "If your income changes month to month, budget from your lowest recent month. Anything above it is a bonus to assign, not a baseline to spend.",
      "Sort bills into cannot move, can negotiate, and can cancel. Spend your energy on the middle column: insurance, phone, internet, and interest rates.",
      "Give yourself a guilt free amount every month, even $20, that needs no justification. Budgets with zero room are the ones people abandon.",
    ],
  },

  "Bank Fees and Where You Keep Cash": {
    facts: [
      "The national average savings account pays well under half a percent, while many online high yield savings accounts pay around 4%, roughly ten times more, as of 2026.",
      "Online savings accounts carry the same federal insurance as big bank accounts: $250,000 per depositor, per bank, per ownership category.",
      "Credit union deposits are insured by the NCUA to the same $250,000 limit.",
      "The average overdraft fee is about $27 and most checking accounts still charge one, after a rule capping it at $5 was repealed in May 2025.",
      "Banks must get your permission before charging overdraft fees on everyday debit card purchases, and you can withdraw that permission at any time.",
      "Monthly maintenance fees on checking accounts can usually be avoided with direct deposit or by switching to a no fee account, and many banks now offer them.",
      "A certificate of deposit locks money for a set term at a fixed rate, with an early withdrawal penalty of commonly three to six months of interest.",
      "About one in twenty households has no bank account and relies on check cashing and prepaid cards that charge fees on every transaction.",
    ],
    painPoints: [
      "My savings account earned $2 last year",
      "I got hit with three overdraft fees in one day",
      "I do not trust online banks with my money",
      "Every paycheck I lose money to check cashing fees",
    ],
    stats: [
      "The FDIC national average savings rate was 0.38% in mid 2026, while many online high yield savings accounts paid around 4%, so $10,000 earns roughly $38 a year at a typical bank versus roughly $400 online.",
      "Bankrate's 2025 checking study found the average overdraft fee was $26.77 and 94% of accounts still charged one; the CFPB's $5 cap was repealed in May 2025.",
      "FDIC and NCUA insurance each cover $250,000 per depositor, per institution, per ownership category, backed by the US government.",
    ],
    moves: [
      "Open a high yield savings account online, confirm it says FDIC or NCUA insured, and move your cushion there. It takes ten minutes and the difference on $5,000 is close to $200 a year.",
      "Call your bank and opt out of debit card overdraft coverage. Declined at the register is free. Overdrafted at the register is $27.",
      "Ask your bank to waive any overdraft or maintenance fee you were charged in the last year. First time asks are granted more often than people think.",
      "If you pay to cash checks, look at a credit union or a bank offering a Bank On certified account. They are built with no overdraft fees and low or no minimums.",
      "Use a CD only for money with a known date, like a deposit or tuition due in a year. For money you might need anytime, high yield savings is the better fit.",
    ],
  },

  "Getting Out of Debt": {
    facts: [
      "Credit card balances passed $1.26 trillion in mid 2026, and about one in five people with card debt do not believe they will ever pay it off.",
      "Nonprofit credit counseling agencies offer free budget sessions and debt management plans that combine card payments into one and usually get interest rates cut, without a new loan.",
      "A debt management plan is not debt settlement; settlement companies charge fees, tell you to stop paying, and often leave credit damage and tax bills behind.",
      "Card issuers run hardship programs that can lower the rate or payment for a set period, but they do not forgive the balance and may close the card.",
      "Paying the highest rate first saves the most money; paying the smallest balance first builds momentum, and research shows people who clear a small account first are more likely to finish.",
      "Debt consolidation loans only help if the new rate is lower and the old cards stay unused afterward.",
      "Collection accounts can often be negotiated for less than the full balance, and getting the agreement in writing before paying is essential.",
      "Very old debts may be past the statute of limitations for a lawsuit, and in some states a small payment restarts that clock.",
      "Bankruptcy is a legal tool with a stigma much larger than its real cost, and a first consultation with a bankruptcy attorney is usually free.",
    ],
    painPoints: [
      "My debt feels like a hole I will never climb out of",
      "I do not know whether to pay the biggest balance or the highest rate first",
      "I am too ashamed to tell anyone how much I owe",
      "A debt settlement company called and I do not know if it is a scam",
    ],
    stats: [
      "The New York Fed put US credit card balances at $1.263 trillion at the end of June 2026, and Bankrate found 22% of people with card debt do not expect to ever pay it off.",
      "Nonprofit debt management plans typically run 3 to 5 years with one monthly payment and reduced interest rates, and the National Foundation for Credit Counseling waives fees for people with low incomes.",
      "A 2012 study of about 6,000 people in debt programs found those who paid off small accounts first were more likely to clear all of their debt.",
    ],
    moves: [
      "Make the list: every balance, rate, and minimum on one page. Most people have never seen their total, and the total is less scary than the fog.",
      "Call a nonprofit credit counselor through the National Foundation for Credit Counseling. The first session is free, and a debt management plan can cut card rates without a new loan.",
      "Pick an order and commit. If your rates are similar, smallest balance first for the win. If one card is far higher, attack that one. Either beats switching methods every month.",
      "Before you talk to any debt settlement company, know that nonprofit counseling is free and settlement usually is not. If they tell you to stop paying your bills, hang up.",
      "Ask each card for its hardship program by name. Lower rate, lower payment, set period. It is a phone call, not a confession.",
    ],
  },

  "Side Income": {
    facts: [
      "About one in eighteen employed Americans works more than one job, and more than nine million people did so in late 2026.",
      "Roughly a quarter to a third of adults report some kind of side income, and the typical side hustle brings in about $200 a month, not a second salary.",
      "Side income is taxable, and anyone earning more than a few hundred dollars from gig work should set aside about a quarter of it for taxes.",
      "Gig apps make workers pay their own expenses, including mileage and self employment tax, so the posted rate is not the take home rate.",
      "Selling unused items, pet sitting, tutoring, and local skilled work tend to pay better per hour than most app based gigs.",
      "A side income can be the fastest way to fund a first $500 cushion or kill a small debt, because it adds money without cutting anything.",
      "A second job's real cost includes childcare, fuel, and rest, and the math can go negative when those are counted.",
      "Side income that grows into a small business can open retirement accounts with higher limits than a job offers.",
    ],
    painPoints: [
      "I already work full time and I am still short every month",
      "I tried driving for an app and after gas I made almost nothing",
      "I have skills but no idea how to turn them into money",
      "I am exhausted and the only answer anyone gives is work more",
    ],
    stats: [
      "Bureau of Labor Statistics data for September 2026 counted 9.0 million people holding more than one job, 5.5% of the employed.",
      "Bankrate's 2025 survey found 27% of adults had a side hustle, with a median income of $200 a month.",
    ],
    moves: [
      "Before you pick a side gig, do the per hour math after expenses: gas, supplies, and about 25% for taxes. Then compare it with asking for more hours or a raise at your main job.",
      "Start with what you already own and know: sell what is sitting in the closet, then offer a skill locally, pet care, yard work, tutoring, repairs. Local and direct usually beats app based.",
      "Open a separate account for side income and move a quarter of every payment to a tax corner of it. April should never be a surprise.",
      "Give side income one job: the first $500 cushion or the smallest debt. Money with a name does not disappear.",
      "Track mileage and expenses from day one with a free app. Every mile and supply lowers the tax bill on that income.",
    ],
  },

  "Raises and Job Changes": {
    facts: [
      "People who change jobs have seen pay rise about 1.4 points faster than people who stay, per the Atlanta Fed's wage tracker.",
      "A raise that does not match inflation is a cut in what the paycheck buys, and that is a fair thing to say out loud in a review.",
      "Most employers expect a negotiation on a new job offer, and the first number offered is rarely the last.",
      "Pay transparency laws in a growing number of states require salary ranges in job postings, which gives workers a public benchmark.",
      "Leaving a job can mean losing group life insurance and disability coverage the same month, so protection should be lined up before the move.",
      "Health coverage, retirement match, paid leave, and tuition help are part of pay, and a job change should compare the whole package.",
      "Asking for a raise with a list of what you delivered and the market range for your role works far better than asking based on need.",
      "An internal move or a title change can be easier to get than a raise, and often brings the raise with it.",
    ],
    painPoints: [
      "I have not had a real raise in three years",
      "I am scared to ask for more money and look greedy",
      "A new job pays more but I would lose my benefits",
      "I do not even know what my job should pay",
    ],
    stats: [
      "The Atlanta Fed Wage Growth Tracker for August 2026 showed job switchers' pay growing 5.0% versus 3.6% for job stayers.",
      "Real average hourly earnings fell 0.7% in the year to September 2026 per the Bureau of Labor Statistics, so a raise under about 4% lost ground to prices that year.",
    ],
    moves: [
      "Look up your role on at least two salary sites and in job postings from states with pay transparency laws. Walk into the conversation with a range, not a feeling.",
      "Write a one page list of what you delivered this year in numbers: customers, revenue, hours saved, problems solved. Hand it over before you say a figure.",
      "Ask for the raise about two months before budgets are set, not the week after. Ask your manager when planning happens.",
      "If you get an offer elsewhere, you can ask the new employer for more and you can tell your current one. Either way, the offer is leverage.",
      "Before you give notice, check what coverage ends: group life, disability, health. Line up replacements first so the gap never opens.",
    ],
  },

  "Benefits You Already Pay For": {
    facts: [
      "Most workers leave money on the table at work: a majority contribute less than the amount needed to collect their full 401(k) match.",
      "The most common match is 50 cents on the dollar up to 6% of pay, which is an instant 50% return on that slice of savings.",
      "Employee assistance programs often include free counseling sessions, legal consultations, and financial coaching that almost nobody uses.",
      "Health savings accounts, available with high deductible plans, let money go in pretax, grow untaxed, and come out tax free for medical costs.",
      "Many employers offer tuition assistance, certification reimbursement, or student loan help that goes unclaimed.",
      "Group life insurance at work is usually a flat amount or one times salary and ends when the job does.",
      "Short term and long term disability through work are worth reading up on, because the waiting periods and replacement percentages vary a lot.",
      "Open enrollment is the one time a year most of these choices can be changed, and the default choices are rarely the best ones.",
    ],
    painPoints: [
      "I signed the benefits forms on my first day and never looked again",
      "I cannot afford to put money in the 401(k) right now",
      "I had no idea my job offered that",
      "The benefits website is a maze and I gave up",
    ],
    stats: [
      "Vanguard's How America Saves 2026 found the median 401(k) balance was $44,115 while the average was $167,970, and the most common match formula is 50 cents per dollar on the first 6% of pay.",
      "Vanguard reports only a little over 40% of workers in its plans contribute enough to collect the full employer match.",
      "Bureau of Labor Statistics data for March 2026 show 59% of private sector workers had access to employer life insurance, 44% to short term disability, and 37% to long term disability.",
    ],
    moves: [
      "Find out the exact match formula at your job and contribute to that line first. Below it you are refusing free pay. Above it, do whatever fits your situation.",
      "Look up your employee assistance program. Free counseling sessions, legal help, and financial coaching are commonly included and confidential.",
      "Download your benefits summary and read the life and disability sections once. Note the coverage amount, the waiting period, and what percentage of pay it replaces.",
      "Mark open enrollment on your calendar and spend one hour on it. Compare the premium plus the deductible for each health plan, not just the premium.",
      "Ask HR one question: what do we offer that most people do not use? The answer is often tuition help, a commuter benefit, or a student loan match.",
    ],
  },

  "Money Stress and Shame": {
    facts: [
      "Money is the most common source of stress for American adults, and the share saying so has risen to about seven in ten in 2026.",
      "Shame makes money problems worse because it keeps people from opening the mail, making the call, or asking for help.",
      "Avoidance is a predictable response to stress, not a character flaw, and the fix starts with one small specific action rather than a complete plan.",
      "Most people with debt or no savings are responding to prices, pay, and emergencies, not to a moral failure.",
      "Talking about money with one trusted person cuts the isolation that makes money stress heavy.",
      "Nonprofit counselors, employee assistance programs, and community organizations offer free help, and using it is a sign of competence.",
      "Financial stress shows up in sleep, health, and relationships, so treating it is health care, not vanity.",
      "Progress is measured from where you started, not from where someone online says you should be.",
    ],
    painPoints: [
      "I feel sick every time I open my banking app",
      "I am ashamed that I am this old and still broke",
      "I hide my money problems from my partner",
      "Everyone else seems to have it figured out and I do not",
    ],
    stats: [
      "The American Psychological Association's Stress in America 2026 survey found 71% of adults call money a significant source of stress, up from 63% in 2023.",
      "Bankrate's 2026 survey found 22% of people with credit card debt do not believe they will ever pay it off, and 61% have carried it for at least a year.",
    ],
    moves: [
      "Pick one thing to open this week: one bill, one statement, one login. Not the whole pile. Seeing the number almost always feels better than guessing at it.",
      "Tell one person the real number. A partner, a friend, a counselor. Shame shrinks the moment it is said out loud.",
      "Make a ten minute money date with yourself on the same day each week, with something nice next to you. Short and regular beats a weekend of panic.",
      "Write down one true thing that improved this year, even if it is only that you know the numbers now. Progress counts from your own starting line.",
      "If money stress is wrecking your sleep, call your employee assistance program or 211. Free counseling exists and using it is the smart move.",
    ],
  },

  "Scams That Target Stressed People": {
    facts: [
      "Reported fraud losses hit a record of nearly $16 billion in 2025, and younger adults report losing money to scams more often than older adults.",
      "Scams aimed at people in debt include fake debt relief, fake student loan forgiveness, and fake government grant offers that charge a fee up front.",
      "Impersonation scams, callers pretending to be the IRS, Social Security, your bank, or a delivery company, are the most common type reported.",
      "No government agency asks for payment by gift card, cryptocurrency, wire, or payment app, and no legitimate lender guarantees approval before seeing your credit.",
      "Urgency is the tell: a real creditor or agency gives you time and puts things in writing.",
      "Debt collectors must give written notice and verify the debt on request, and fake collectors count on people not knowing that.",
      "Payment app transfers are usually final, so a scammer who gets you to send money that way is hard to catch.",
      "Reporting a scam to the FTC at reportfraud.ftc.gov helps even when the money is gone, because patterns get shut down.",
    ],
    painPoints: [
      "Someone called about my student loans and I almost paid them",
      "I got a text saying my account was locked and I clicked it",
      "I am embarrassed that I fell for it",
      "I cannot tell real collection calls from fake ones anymore",
    ],
    stats: [
      "The FTC recorded 3 million fraud reports and a record $15.9 billion in reported losses in 2025, with imposter scams costing more than $3.5 billion.",
      "In FTC data for 2024, adults in their 20s reported losing money in 44% of their fraud reports versus 24% for adults in their 70s, so this is not only an older person's problem.",
      "The FTC estimated true fraud losses in 2024 could have reached as high as $195.9 billion once unreported cases are counted.",
    ],
    moves: [
      "Hang up, then call back using the number on your card or statement. Real banks and agencies do not mind. Scammers cannot survive it.",
      "Anyone who asks for a gift card, crypto, wire, or payment app transfer to fix a debt or fee is a scammer. No exceptions.",
      "Every federal student loan fix is free at studentaid.gov. Anyone charging a fee for forgiveness or consolidation is selling you nothing.",
      "Ask any collector to send written validation of the debt before you pay a dollar. The law requires it, and fakes vanish when asked.",
      "Freeze your credit at all three bureaus for free. It stops new accounts in your name and takes five minutes to lift when you need it.",
    ],
  },

  "Building Credit": {
    facts: [
      "A credit score is a lending risk score, but it also affects rent applications, car insurance prices in most states, and some job and utility checks.",
      "Having no credit score can cost more than having a fair one, because drivers with no credit history pay about half again as much for car insurance as drivers with excellent credit.",
      "Payment history is the largest piece of a score, and paying a card in full each month builds credit just as well as carrying a balance, with no interest.",
      "Keeping balances low relative to limits matters, and the 30% guideline is a rule of thumb from the industry, not a law.",
      "Rent, utility, and phone payments can now count toward some scores, and in 2025 the mortgage regulator approved a score that includes them for home loans.",
      "A secured card, backed by a small deposit, or being added as an authorized user on a trusted person's card are the two most common ways to start from nothing.",
      "Checking your own credit never hurts your score, and you can pull all three reports free every week at annualcreditreport.com.",
      "Mistakes on credit reports are common, and disputing them is free and usually resolved within 30 days.",
    ],
    painPoints: [
      "I have no credit history and keep getting turned down",
      "I made mistakes years ago and my score still hurts",
      "I was told never to use credit cards and now I cannot rent an apartment",
      "I do not understand what actually moves my score",
    ],
    stats: [
      "WalletHub quote tests found drivers with no credit history paid 49% to 53% more for car insurance than drivers with excellent credit, and only California, Hawaii, and Massachusetts ban credit based insurance pricing.",
      "FICO scores run from 300 to 850, and payment history is about 35% of the score, the single largest factor.",
      "In July 2025 the Federal Housing Finance Agency approved VantageScore 4.0, which counts rent, utility, and phone payments, for use on Fannie Mae and Freddie Mac mortgages.",
    ],
    moves: [
      "Pull all three reports free at annualcreditreport.com and dispute anything wrong. Errors come off, and that is the fastest score jump there is.",
      "If you are starting from nothing, open a secured card with a small deposit, put one recurring bill on it, and pay it in full every month. That is the whole strategy.",
      "Ask a family member with good habits to add you as an authorized user. You do not need to use the card for their history to help yours.",
      "Pay your card before the statement closes, not just before the due date, so the reported balance is low even if you use the card a lot.",
      "Ask your landlord or a rent reporting service to report your rent. Years of on time rent can count toward some scores now.",
    ],
  },

  // ── Protection (John's lane) ──────────────────────────────────────
  "Term Life Insurance": {
    facts: [
      "Term life insurance covers you for a set number of years, usually 10, 20, or 30, and pays a tax free lump sum to your people if you die during that time.",
      "It is the most affordable kind of life insurance because it has no savings component; it is pure protection.",
      "About three quarters of adults overestimate what term life costs, and a healthy 30 year old can often get $500,000 of coverage for roughly the price of a streaming bundle each month.",
      "Premiums on a level term policy stay the same for the whole term, which matters in a time when every other bill keeps rising.",
      "The younger and healthier you are when you buy, the lower the rate locks in for the whole term.",
      "Many term policies can be converted to permanent coverage later with no new medical exam.",
      "Coverage through work is usually a flat amount or one times salary and ends when the job ends, which is exactly when a family is most exposed.",
      "Stay at home parents need coverage too, because replacing the care they provide costs real money.",
      "Just over half of adults own any life insurance, and about 92 million say they need coverage or more of it.",
    ],
    painPoints: [
      "I only have the life insurance my job gives me",
      "I assumed life insurance was way out of my budget",
      "I keep putting it off because I am young and healthy",
      "If something happened to me, my family would lose the apartment within two months",
    ],
    stats: [
      "LIMRA's 2026 Insurance Barometer found 52% of adults own life insurance and 38%, about 92 million people, say they need coverage or more of it.",
      "About three quarters of consumers overestimate the cost of term life, and healthy adults under 30 overestimate it by 5 to 6 times, per LIMRA and Life Happens in 2026.",
      "Policygenius' price index put a $500,000, 20 year term policy for a healthy 30 year old man at about $29.56 a month in October 2025, and about $23.10 for a woman.",
    ],
    moves: [
      "Get a real quote before you decide you cannot afford it. Most people guess three to five times too high.",
      "Start with the gap: what would your household need to cover rent or the mortgage, debts, and childcare for the years until the kids are grown? That number, not a rule of thumb, is your coverage amount.",
      "If money is tight, a smaller term policy you can keep beats a bigger one you drop in a year. Coverage you keep is the only coverage that pays.",
      "Check what your job actually provides, in dollars, and remember it ends the day you leave. Your own policy goes with you.",
      "If you smoke or vape, ask about rates after 12 months tobacco free. The difference is often more than half.",
    ],
  },

  "Life Insurance When Money Is Tight": {
    facts: [
      "Cost is the number one reason people give for not buying life insurance, yet most of them have never priced it.",
      "A smaller policy that fits the budget protects a family; a perfect policy that never gets bought protects nobody.",
      "Term life for a healthy adult in their 20s or 30s can cost less per month than one meal out, and the rate does not rise during the term.",
      "Simplified issue policies skip the medical exam and can be approved within days, often for amounts up to a few hundred thousand dollars.",
      "Dropping a policy because money got tight is common; most insurers offer a grace period and many let you reduce the coverage amount instead of cancelling.",
      "Final expense policies are small permanent policies meant to cover a funeral, which runs several thousand dollars, so the family is not passing a hat.",
      "Life insurance payouts are generally free of income tax and go directly to the named beneficiary, outside of probate, usually within weeks.",
      "Buying when healthy locks in a rate that no later health problem can change.",
    ],
    painPoints: [
      "There is no room in my budget for one more bill",
      "I would rather put that $30 toward my credit card",
      "I will buy it when things calm down",
      "I feel guilty that my kids have nothing if something happens to me",
    ],
    stats: [
      "Cost was the top reason given for not owning life insurance, cited by 46% of people with a coverage gap in LIMRA's 2025 study, yet about three quarters of consumers overestimate the price.",
      "A $500,000, 20 year term policy for a healthy 30 year old ran about $23 to $30 a month in Policygenius' October 2025 index, which is roughly $1 a day.",
    ],
    moves: [
      "Price a 20 year term policy at two or three coverage amounts. Pick the largest one you can keep paying in a bad month, not a good one.",
      "If an exam feels like a barrier, ask about simplified issue coverage. It costs a bit more per dollar of coverage but can be in place this week.",
      "Before you cancel a policy, call and ask to lower the coverage amount instead. A smaller policy that stays in force beats starting over older.",
      "Put the premium on autopay from the account your paycheck lands in, right after payday. A lapsed policy is the most expensive kind.",
      "Treat it as a monthly bill in the same column as the phone, not as a luxury you buy when things calm down. Things do not calm down on a schedule.",
    ],
  },

  "Life Insurance Amounts": {
    facts: [
      "The old rule of 10 to 12 times income is easy to remember and wrong for most households, because it ignores what the family actually owes and needs.",
      "A needs based number adds up debts, income to replace for a set number of years, the mortgage or years of rent, and education or childcare costs, then subtracts savings and existing coverage.",
      "A household that rents still needs housing covered, and years of rent can add up to as much as a mortgage balance.",
      "Coverage should last until the people who depend on you no longer do, which is usually when the youngest child is grown or the mortgage is paid.",
      "Most group life coverage through work is one times salary or less, which covers a year or two, not a childhood.",
      "Two income households often insure only the higher earner, when losing either income would break the budget.",
      "A stay at home parent's coverage is sized by what it would cost to replace childcare and household work, which can run tens of thousands a year.",
      "Coverage needs change with life, so the number should be revisited after a baby, a move, a new job, or a divorce.",
    ],
    painPoints: [
      "I picked a coverage amount out of thin air",
      "I do not know if my current policy is enough",
      "I am worried a bigger policy would be unaffordable",
      "I rent, so I figured I did not need as much",
    ],
    stats: [
      "Childcare averages $13,184 a year per child per Child Care Aware of America, so replacing a stay at home parent's care for two children for 10 years is well over $250,000 before anything else.",
      "Typical asking rent of about $1,932 a month in September 2026 per Zillow works out to more than $23,000 a year, so 10 years of housing for a renting family is over $230,000.",
    ],
    moves: [
      "Do the four line math: debts, years of income your family would need, housing until the kids are grown, and school or childcare. Subtract savings and work coverage. That is your number.",
      "If the number feels huge, remember term coverage is priced per thousand dollars and large policies are not proportionally more expensive. Get the quote before you shrink the number.",
      "Insure both parents, including the one who earns less or stays home. Losing either one changes the budget.",
      "Add a line for a few months of breathing room so a grieving family does not have to make money decisions in the first weeks.",
      "Set a reminder to rerun the number after any big life change. It takes five minutes and keeps the coverage honest.",
    ],
  },

  "Life Insurance Riders": {
    facts: [
      "Riders are optional add ons that change what a policy does, and some of the most useful ones cost little or nothing.",
      "A waiver of premium rider keeps the policy in force without payments if you become disabled, usually after a waiting period.",
      "An accelerated death benefit rider lets a terminally ill policyholder use part of the payout while living, and is included free on many policies.",
      "A child rider adds a small amount of coverage for all of your children for one low price and can often be converted later without a medical exam.",
      "A conversion privilege lets you switch term coverage to permanent coverage later without proving health again, which matters if health changes.",
      "A return of premium rider refunds premiums if you outlive the term, but it raises the cost enough that many people do better keeping the difference.",
      "Not every rider is worth paying for, and an agent should be able to explain each one in a sentence.",
    ],
    painPoints: [
      "I have a policy but no idea what the extra options on it do",
      "I am afraid I could not keep paying if I got sick or hurt",
      "The add ons sound like upsells and I do not know which matter",
      "I want coverage that can grow with my life instead of expiring",
    ],
    stats: [
      "Many term policies can be converted to permanent coverage with no new medical exam, often until age 65 or 70.",
      "A waiver of premium rider commonly kicks in after a waiting period of 90 days to 6 months of total disability.",
    ],
    moves: [
      "Ask which riders on your policy are free. Accelerated death benefit often is, and it should be on.",
      "If your household depends on your paycheck, price the waiver of premium rider. It is the one that keeps the policy alive when you cannot work.",
      "If you have kids, compare a child rider with separate small policies. The rider is usually cheaper and covers every child for one price.",
      "Ask for the conversion deadline in writing. Knowing you can convert later without an exam is only useful if you know the date.",
      "Skip a rider you cannot explain to a friend in one sentence. If the agent cannot either, that is your answer.",
    ],
  },

  Beneficiaries: {
    facts: [
      "The beneficiary form on a life insurance policy or retirement account overrides a will, so an outdated form sends money to the wrong person no matter what the will says.",
      "Naming a minor child directly usually means a court has to appoint someone to manage the money until the child is an adult.",
      "You can name several beneficiaries with percentages and should always name a backup in case the first one dies before you.",
      "Divorce does not automatically remove an ex spouse from every policy or account, and the rules vary by state and by plan.",
      "Naming your estate as beneficiary sends the money through probate, which adds months and costs.",
      "Bank accounts can carry a payable on death designation that works the same way and costs nothing to set up.",
      "Reviewing beneficiaries takes about fifteen minutes a year and prevents some of the worst stories in financial planning.",
    ],
    painPoints: [
      "I have no idea who is listed on my accounts and policies",
      "I got divorced or remarried and never updated anything",
      "I assumed my will covers my accounts and policies",
      "I want my kids taken care of but they are minors",
    ],
    stats: [
      "A beneficiary form on a life insurance policy or retirement account overrides a will, so a 10 year old designation can send money to an ex spouse.",
      "You can name several beneficiaries with percentages, for example 50% to a spouse and 25% to each of two children, plus a backup in case they pass first.",
    ],
    moves: [
      "Log in to every policy and retirement account this week and read the beneficiary line out loud. Fix anything that is wrong on the spot. It takes minutes.",
      "Name a backup beneficiary on everything. The primary dying first is more common than people think.",
      "If your kids are minors, talk to an agent or attorney about naming a trust or a custodian under your state's law instead of the child directly.",
      "Ask your bank about a payable on death designation on checking and savings. It is free and keeps the money out of probate.",
      "After any wedding, divorce, birth, or death in the family, make beneficiary review the first paperwork you do.",
    ],
  },

  "Wills and Trusts": {
    facts: [
      "A will names who gets your belongings and, most importantly for parents, who raises your kids, and most adults do not have one.",
      "Without a will, state law decides who inherits and a judge decides who cares for minor children.",
      "A will does not control life insurance or retirement accounts, which follow their beneficiary forms instead.",
      "A simple will can be done inexpensively or free through legal aid, employer legal plans, or reputable online services, and does not require wealth.",
      "A trust can control how and when money reaches heirs, which matters when children are young or a beneficiary has special needs.",
      "A will goes through probate, a public court process that can take months; a trust generally avoids it.",
      "Employee assistance programs and some workplace benefits include free or discounted will preparation that almost nobody uses.",
    ],
    painPoints: [
      "I do not have a will and do not know how to start",
      "I have kids and nothing written down about who would care for them",
      "I assume my family will just sort it out",
      "I thought wills were for people with money",
    ],
    stats: [
      "Surveys consistently find only about 1 in 3 American adults has a will.",
      "Without a will, state law decides who inherits, and a minor child cannot receive an inheritance directly until age 18 or 21 depending on the state.",
    ],
    moves: [
      "If you are a parent, the first job of a will is naming a guardian. Decide that one thing this month, even before the rest.",
      "Check your employee assistance program or benefits for a free will service before paying anyone.",
      "Make a simple will now and improve it later. A basic signed will beats a perfect plan that never gets written.",
      "Tell the person you named as guardian or executor. A surprise appointment is unfair to them and to your kids.",
      "Keep a one page list of where your accounts, policies, and the will itself live, and tell one trusted person where the list is.",
    ],
  },

  "Healthcare Directives": {
    facts: [
      "A healthcare directive names someone to make medical decisions for you if you cannot speak, and spells out what you would want.",
      "Any adult can sign one, every state recognizes them, and the forms are free from most hospitals and state health departments.",
      "Without one, family members can be left guessing and disagreeing at the worst possible moment.",
      "A spouse does not automatically have the final say in every state or every situation.",
      "A directive can be changed at any time and should be revisited after major health or family changes.",
      "Giving copies to your doctor and the person you named is as important as signing it.",
    ],
    painPoints: [
      "I have never told anyone what I would want medically",
      "I assumed my spouse could just decide for me",
      "I do not know who would speak for me in an emergency",
      "It feels morbid to plan for",
    ],
    stats: [
      "Anyone 18 or older can sign a healthcare directive, and every US state recognizes them.",
      "Studies estimate only about 1 in 3 US adults has completed any advance directive.",
    ],
    moves: [
      "Download your state's free advance directive form from the state health department or a hospital website. It is a few pages.",
      "Pick the person who can stay calm and follow your wishes under pressure, which is not always the closest relative.",
      "Have the conversation over dinner, not in a hospital. Say what matters most to you in plain words.",
      "Give a copy to your doctor and your named person, and keep a photo of it on your phone.",
      "Revisit it after a diagnosis, a marriage, a divorce, or a move to another state.",
    ],
  },

  "Estate Planning": {
    facts: [
      "Estate planning is not about being rich; it is about who gets your stuff, who raises your kids, and who handles things if you cannot.",
      "For most families, an estate plan is a will, beneficiary forms, a healthcare directive, and a financial power of attorney.",
      "A financial power of attorney lets someone pay your bills and manage accounts if you are alive but unable to, which is more likely than death for younger adults.",
      "Almost no families owe federal estate tax; the exemption is in the millions per person.",
      "Probate is public, slow, and costs money, and beneficiary designations and payable on death forms route most assets around it for free.",
      "Digital accounts, photos, and passwords are part of an estate now, and a list of where they are saves a family weeks of pain.",
      "An estate plan done once and never updated can be worse than none, because it can point to the wrong people.",
    ],
    painPoints: [
      "I think estate planning is only for wealthy people",
      "I do not know what happens to my stuff if something happens to me",
      "Talking about death makes me avoid the whole topic",
      "My parents have no plan and I do not know how to bring it up",
    ],
    stats: [
      "The federal estate tax exemption was $13.99 million per person in 2025 and rises to $15 million in 2026, so the vast majority of estates owe no federal estate tax.",
      "Surveys consistently find only about 1 in 3 American adults has a will.",
    ],
    moves: [
      "Start with the four documents: will, beneficiary forms, healthcare directive, financial power of attorney. Do them in that order over four weekends.",
      "Write a one page where things are list: accounts, policies, password manager, and who to call. Store it where one trusted person can find it.",
      "Ask your employee assistance program or benefits portal about free legal help before paying for documents.",
      "Bring it up with parents using yourself as the example: I just did my will and directive, do you have yours? It opens the door without pointing fingers.",
      "Set a yearly reminder to check the plan against your life. Marriage, babies, moves, and job changes all change the answers.",
    ],
  },

  "Disability Protection": {
    facts: [
      "A long illness or injury that stops your paycheck is far more likely in your working years than dying is, and most people have little or nothing in place for it.",
      "About one in four people in their 20s today will be disabled for at least a year before reaching retirement age, per the Social Security Administration.",
      "Social Security disability pays an average of a little over $1,600 a month, has a strict definition, and takes months to approve.",
      "Fewer than half of private sector workers have access to short term disability through work, and fewer still have long term disability.",
      "Employer long term disability commonly replaces about 60% of base pay after a waiting period of 90 days or more, and the benefit is often taxable if the employer paid the premium.",
      "Short term disability covers the first weeks or months, including childbirth recovery in many plans.",
      "Individual disability policies go with you when you change jobs, and rates are based on age, health, and occupation.",
      "Your paycheck is the asset every other plan depends on, which is why insuring it comes before most other goals.",
    ],
    painPoints: [
      "If I could not work for a few months, I could not pay my bills",
      "I never thought about my income as something to insure",
      "I assumed my job or the government would cover me",
      "I work with my hands and an injury would end my paycheck",
    ],
    stats: [
      "The Social Security Administration estimates a 24% chance, about 1 in 4, that a 20 year old today becomes disabled before reaching retirement age.",
      "The average Social Security disability benefit was $1,636.47 a month in September 2026, and about 7 million disabled workers were receiving it.",
      "Bureau of Labor Statistics data for March 2026 show only 44% of private sector workers had access to short term disability and 37% to long term disability through work.",
    ],
    moves: [
      "Look up what your job provides for short and long term disability: the percentage of pay, the waiting period, and whether it is taxable. Write those three numbers down.",
      "If your job offers voluntary disability coverage at open enrollment, price it. Group rates are often the cheapest you will ever see.",
      "Ask yourself how many weeks your household could run with no paycheck. That number tells you how long a waiting period you can afford.",
      "If you are self employed or work a physical job, get an individual disability quote. Your paycheck is the asset everything else depends on.",
      "Keep a copy of your disability policy and the claim phone number where your partner can find it.",
    ],
  },

  "Health Coverage": {
    facts: [
      "Medical bills are a leading cause of debt even for people with insurance, because deductibles and out of pocket maximums have grown faster than pay.",
      "Every marketplace plan and most employer plans have an out of pocket maximum, which is the real worst case number to know, not the premium.",
      "Losing a job opens a special enrollment window on healthcare.gov, and marketplace subsidies are based on current income, so a lower income can mean a much cheaper plan.",
      "Medicaid covers more people than most assume, and income limits in expansion states reach well above the poverty line.",
      "Preventive care, including annual checkups and many screenings, is covered at no cost on most plans, and skipping it leads to bigger bills later.",
      "Young adults can stay on a parent's plan until age 26.",
      "Hospitals must post their prices and give good faith estimates to uninsured and self pay patients under federal rules.",
      "A health savings account, if your plan allows one, is the only account that is tax free going in, growing, and coming out for medical costs.",
    ],
    painPoints: [
      "I skip going to the doctor because I am afraid of the bill",
      "I do not understand my plan's deductible and out of pocket costs",
      "I am between jobs and have no coverage",
      "I have insurance and still cannot afford to use it",
    ],
    stats: [
      "Every marketplace health plan has an out of pocket maximum; for 2025 it was capped at $9,200 for an individual and $18,400 for a family, and the cap rises each year.",
      "Young adults can stay on a parent's health plan until age 26 under the Affordable Care Act.",
      "An Urban Institute survey in late 2025 found 26% of adults with health insurance still had medical debt in their family.",
    ],
    moves: [
      "Find three numbers on your plan: deductible, out of pocket maximum, and copay for a regular visit. Those three tell you what a bad year costs.",
      "If you lose a job, go to healthcare.gov within 60 days. With lower income, the subsidy can make a plan cost a fraction of COBRA.",
      "Check Medicaid eligibility for your state before assuming you earn too much, especially if your household has kids or income dropped.",
      "Use the free preventive visit every year. Catching something early is the cheapest medical care there is.",
      "Ask for a good faith estimate before any planned procedure, and ask whether the facility and the doctor are both in network. Those are the two surprise bills.",
    ],
  },

  "Family and Kids": {
    facts: [
      "A new baby changes the budget by thousands a year in childcare, medical costs, and lost income, and most families get no formal help planning for it.",
      "Childcare averages more than $13,000 a year per child, and infant care in a center is higher in most states.",
      "The child tax credit and the earned income tax credit return thousands of dollars to working families each year, and some who qualify never file for them.",
      "Life insurance for both parents becomes urgent with a child, because the surviving parent would face childcare and housing on one income.",
      "Naming a guardian in a will is the single most important paperwork a parent can do.",
      "Kids can stay on a parent's health plan until 26, and the Children's Health Insurance Program covers kids in families earning well above Medicaid limits.",
      "A 529 plan can help with education costs but comes after a cushion, debt control, and protection, not before.",
      "Children learn money habits by watching, and talking about tradeoffs out loud teaches more than lectures.",
    ],
    painPoints: [
      "We just had a baby and our finances feel upside down",
      "Child care costs more than I expected",
      "I do not know how to protect my family if something happens to me",
      "I want to teach my kids about money but nobody taught me",
    ],
    stats: [
      "Child Care Aware of America put the national average price of childcare at $13,184 per child in 2025.",
      "Under the Affordable Care Act, children can stay on a parent's health plan until age 26.",
      "LIMRA's 2024 workplace fact sheet found about 65% of employed Americans rely on life insurance through work, which ends when the job does.",
    ],
    moves: [
      "In the first month with a new baby, do three things: add the baby to health coverage within 30 days, name a guardian, and price term life for both parents.",
      "File taxes even if you do not owe. The child tax credit and earned income tax credit can be worth thousands to a working family.",
      "Ask HR about a dependent care FSA and check your state's childcare subsidy limits before the daycare bill starts.",
      "Keep education savings behind the basics. A funded cushion and protected income help a kid more than a 529 balance.",
      "Narrate small money choices out loud with your kids: we are buying this one because it is cheaper per ounce. That is financial education.",
    ],
  },

  "Life Changes": {
    facts: [
      "Marriage, a new baby, a home, a new job, and a divorce are the five events that most often leave coverage, beneficiaries, and plans out of date.",
      "Changing jobs usually ends group life and disability coverage on the last day of work, before the new job's coverage starts.",
      "A divorce decree does not always update beneficiary forms, and in some states a former spouse stays listed until you change it.",
      "Buying or renting a bigger place raises the amount a family would need if an income disappeared.",
      "A new baby means adding to health coverage within about 30 days, updating the will for a guardian, and revisiting life insurance for both parents.",
      "A move to another state can change estate documents, insurance rates, and tax rules.",
      "Each life change is a natural moment to review everything, which is easier than remembering to do it on a random Tuesday.",
    ],
    painPoints: [
      "I just got married and we have not talked about money",
      "We are expecting and I do not know what to update",
      "I bought a house and my old coverage no longer fits",
      "I went through a divorce and my paperwork is a mess",
    ],
    stats: [
      "Most group life insurance through work pays about 1 times salary and stops the day you leave, and LIMRA finds about 65% of employed Americans rely on it.",
      "Marriage, a new baby, a home purchase, and a divorce are the 4 life events that most often leave coverage and beneficiaries out of date.",
    ],
    moves: [
      "After any big life event, run the same five minute checklist: beneficiaries, life insurance amount, will and guardian, health coverage, emergency contacts.",
      "When you change jobs, line up your own term policy before the last day so the coverage gap never opens.",
      "After a divorce, pull every policy and account and change the beneficiary yourself. Do not assume the decree did it.",
      "When you sign a lease or mortgage for a bigger place, rerun your coverage number the same week.",
      "Newly married: pick a monthly money date and share the real numbers, debts included, before you merge anything.",
    ],
  },

  "Talking to Family About Money": {
    facts: [
      "Money is the most common source of stress for adults and one of the least discussed topics in most families.",
      "Couples who talk about money regularly report less conflict about it, even when the numbers are hard.",
      "Adult children often do not know whether their parents have a will, a directive, or life insurance until a crisis forces the question.",
      "Kids absorb money attitudes from what they overhear, so silence teaches something too.",
      "Starting with your own situation, not the other person's, makes the conversation an offer instead of an accusation.",
      "A short regular money check in beats a rare long one that turns into a fight.",
      "Asking a parent where their important papers are is a love question, not a money question.",
    ],
    painPoints: [
      "Money is a taboo subject in my family",
      "I do not know if my parents have a plan for later in life",
      "My partner and I avoid the money conversation",
      "I want to talk to my adult kids about money without lecturing",
    ],
    stats: [
      "The American Psychological Association's 2026 survey found 71% of adults call money a significant source of stress.",
      "Only about 1 in 3 American adults has a will, so odds are someone at your table does not have a plan written down.",
    ],
    moves: [
      "Open with your own homework: I just updated my beneficiaries and did a will. Have you done yours? It invites instead of accuses.",
      "With a partner, book a 20 minute money date on the same day each week with something nice on the table. Short and regular beats rare and long.",
      "Ask parents one practical question: if something happened, where would I find your papers? It opens the whole conversation gently.",
      "With kids, talk about choices out loud, not amounts. We picked this because it lasts longer. That teaches tradeoffs without fear.",
      "Agree on one rule for hard news: no blame for the past, only the next step. It keeps the door open.",
    ],
  },

  // ── The longer game ───────────────────────────────────────────────
  "Retirement Planning": {
    facts: [
      "The first retirement move for most workers is collecting the full employer match, because it is the only guaranteed return there is.",
      "The typical match is 50 cents on the dollar up to 6% of pay, and a majority of workers contribute less than enough to collect all of it.",
      "The median 401(k) balance is far below the average because a small number of large accounts pull the average up; most people have less saved than the headlines suggest.",
      "Roughly three in four private sector workers have access to a retirement plan at work, but only about half participate.",
      "Starting small and raising the contribution by 1% a year is how most people get from nothing to meaningful savings without feeling it.",
      "Retirement savings can be tapped in a true emergency, but early withdrawals usually cost taxes plus a 10% penalty, which is why a separate cushion matters.",
      "Social Security replaces only part of a working income, and the age you claim changes the monthly check for life.",
      "The only wrong first step is none; John's lane is protecting the income that funds retirement, not picking investments.",
    ],
    painPoints: [
      "I have not started saving for retirement and I am worried it is too late",
      "I do not understand my workplace retirement plan",
      "I cannot afford to put anything in right now",
      "I am self employed and have no plan at all",
    ],
    stats: [
      "Vanguard's How America Saves 2026 reports a median 401(k) balance of $44,115 versus an average of $167,970, and the most common match is 50 cents per dollar on the first 6% of pay.",
      "Vanguard reports a little over 40% of workers in its plans contribute enough to earn the full employer match, so most are leaving some match behind.",
      "Bureau of Labor Statistics data show about 72% of private sector workers have access to a retirement plan at work and about 52% participate.",
    ],
    moves: [
      "Find your plan's match formula and contribute exactly to that line first. On a $50,000 salary with a 50% match on 6%, that is $1,500 a year of free pay.",
      "If you cannot reach the match today, start at 1% and turn on automatic annual increases. You will not feel the steps.",
      "Self employed? A SEP IRA or solo 401(k) can be opened at most brokerages for free. Ask a tax professional which fits; the point is to have one.",
      "Keep a separate cash cushion so a car repair never comes out of retirement savings with a 10% penalty attached.",
      "If your job has no plan, an IRA takes ten minutes to open and the yearly limit is a goal, not a requirement.",
    ],
  },

  "Renting vs Buying": {
    facts: [
      "Renting was cheaper than buying on a monthly basis in all 50 of the largest US metros as of 2025, which is the opposite of what most people were told growing up.",
      "Buying and later selling a home costs roughly 8% to 10% of the price in commissions and closing costs, so short stays usually lose money.",
      "Renting is not throwing money away; it buys housing, flexibility, and freedom from repairs, taxes, and insurance surprises.",
      "Owning builds equity over time but ties up a down payment and adds maintenance costs of roughly 1% to 2% of the home's value each year.",
      "The break even point between renting and buying depends on local prices, rates, and how long you stay, and in 2026 it is often five years or more.",
      "Mortgage rates above 7% in 2026 pushed the monthly cost of owning well above renting in most places.",
      "Pressure to buy before you are ready is one of the most expensive pieces of advice in circulation.",
    ],
    painPoints: [
      "I feel like rent is throwing money away",
      "Everyone says buy but I am not ready",
      "I do not know how long I need to stay for buying to make sense",
      "I cannot tell if my market is a good time to buy",
    ],
    stats: [
      "Bankrate's 2025 study found renting cheaper than buying on a monthly basis in all 50 of the largest US metros, with the typical mortgage payment at $2,768 versus about $2,000 in rent.",
      "The 30 year fixed mortgage rate averaged 7.32% in late October 2026 per Freddie Mac, compared with 6.19% a year earlier.",
      "Buying and later selling a home typically costs 8% to 10% of the price in commissions and closing costs, so a stay under about 5 years often loses money.",
    ],
    moves: [
      "Run a rent versus buy calculator that includes selling costs and maintenance, not just the mortgage payment. The honest answer is local and personal.",
      "Ask yourself how many years you are sure you will stay. Under five, renting usually wins on the math.",
      "If buying is the goal, treat renting as the stage where you fix credit and build the down payment, not as failure.",
      "Compare total monthly costs: rent plus renters insurance versus mortgage, taxes, insurance, HOA, and a repair fund. The second list is always longer.",
      "Ignore anyone who says you are throwing money away. You are buying a place to live, on terms you can leave.",
    ],
  },

  "Home Buying": {
    facts: [
      "The median home costs close to five times the median household income in 2026, the widest gap in decades.",
      "A household needs about $110,000 in income to afford the median home at 2026 rates, well above what the median household earns.",
      "The typical first time buyer is now 40, and first time buyers are a record low share of the market.",
      "You do not need 20% down; many loans allow 3% to 5% down, but a smaller down payment means mortgage insurance until you reach 20% equity.",
      "Closing costs usually add 2% to 5% of the loan amount on top of the down payment.",
      "The monthly payment includes taxes and insurance, and both have risen sharply in many states since 2020.",
      "Down payment assistance programs exist in every state and are not only for very low incomes.",
      "A preapproval is free and tells you the real gap between where you are and where you would need to be.",
    ],
    painPoints: [
      "I do not know how much house I can really afford",
      "I am saving for a down payment and it feels endless",
      "I did not know about closing costs and the other fees",
      "I am scared of being house poor",
    ],
    stats: [
      "The median existing home sold for $417,500 in September 2026 per the National Association of Realtors, against a 2025 median household income of $87,460 per the Census Bureau.",
      "Redfin estimated a household needed $109,796 of income to afford the median home in June 2026, roughly $22,000 more than the median household earned.",
      "Closing costs typically run 2% to 5% of the loan amount on top of the down payment.",
    ],
    moves: [
      "Talk to a lender for a free preapproval before you start saving blindly. You will learn the exact credit score, income, and savings gap.",
      "Search your state's housing finance agency for down payment assistance. Many programs reach households earning above the area median.",
      "Budget the full payment: principal, interest, taxes, insurance, HOA, plus 1% of the home's value a year for repairs. If that number scares you, the house is too big.",
      "Get quotes from at least three lenders. Rate and fee differences between lenders on the same day can be thousands of dollars.",
      "Protect the purchase: a term policy covering the mortgage balance costs far less than the mortgage insurance you pay for the lender's protection.",
    ],
  },

  Taxes: {
    facts: [
      "A tax refund is your own money returned without interest, and a large one means too much was withheld all year.",
      "The earned income tax credit and child tax credit put thousands of dollars back in working families' pockets, and many eligible people never claim them because they do not file.",
      "Free tax filing exists: IRS Free File for most households and VITA sites with trained volunteers for people with low and moderate incomes.",
      "Pretax retirement and dependent care contributions lower taxable income this year.",
      "Side income is taxable, and setting aside about a quarter of it avoids a surprise bill in April.",
      "Only the dollars inside each tax bracket are taxed at that rate, so a raise never leaves you with less take home pay.",
      "Paid tax preparers who promise big refunds or charge a percentage of the refund are a red flag.",
      "The IRS offers payment plans online for people who owe and cannot pay all at once, and setting one up stops most collection action.",
    ],
    painPoints: [
      "I get a refund and assume that means I did fine",
      "I owe taxes and have no way to pay it",
      "I am self employed and taxes surprise me every spring",
      "I paid $300 to have someone file a simple return",
    ],
    stats: [
      "There are 7 federal income tax brackets, from 10% to 37%, and only the dollars inside each bracket are taxed at that rate.",
      "Pre tax 401(k) contributions come off this year's taxable income; Roth contributions do not, but qualified withdrawals after age 59 and a half are tax free.",
    ],
    moves: [
      "If your refund is always large, use the IRS withholding estimator and adjust your W4. That money belongs in your paycheck during the year when bills are due.",
      "File even if you earned little or owe nothing. The earned income tax credit and child tax credit only pay out when you file.",
      "Use a free option: IRS Free File or a VITA site. A simple return should not cost $300.",
      "If you owe and cannot pay, set up an IRS payment plan online the same day. Ignoring the bill is what triggers penalties and liens.",
      "Side income: move 25% of every payment into a separate account the day it arrives. April becomes boring.",
    ],
  },
};

// ── Derived views used by topics.ts ──────────────────────────────────

/** Topic name → facts. The roll picks one fact per topic. */
export const FACTS: Record<string, string[]> = Object.fromEntries(
  Object.entries(TOPIC_BANK).map(([topic, entry]) => [topic, entry.facts]),
);

/** Topic name → the viewer's own words. John picks one per piece. */
export const TOPIC_PAIN_POINTS: Record<string, string[]> = Object.fromEntries(
  Object.entries(TOPIC_BANK).map(([topic, entry]) => [topic, entry.painPoints]),
);

/** Topic name → sourced figures for Stat Cards (see docs/content-sources.md). */
export const STAT_FACTS: Record<string, string[]> = Object.fromEntries(
  Object.entries(TOPIC_BANK).map(([topic, entry]) => [topic, entry.stats]),
);

/** Topic name → practical moves the prompt hands the AI. */
export const MOVES: Record<string, string[]> = Object.fromEntries(
  Object.entries(TOPIC_BANK).map(([topic, entry]) => [topic, entry.moves]),
);

/** Every topic name, in the order written above. */
export const TOPIC_NAMES: string[] = Object.keys(TOPIC_BANK);
