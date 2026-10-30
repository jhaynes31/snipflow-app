# Where the numbers come from

Every figure in the content bank (`src/server/seed-facts.ts`, the `stats` and
the numeric `facts` under each topic) traces to a row here. The bank was
rewritten in October 2026 to replace the older rules of thumb with the money
picture working Americans actually live in. When John or Jen wants to check a
number, this is the page.

## How much to trust each row

The research behind this list ran in a sandbox that could not open most
primary websites directly (the Federal Reserve, BLS, Census, CFPB, FDIC and
others blocked the fetch). So every figure was read either in a search
excerpt of the primary organization's own page or in reputable secondary
coverage quoting it. The label on each row says which:

| Label | Meaning |
|---|---|
| **Primary excerpt** | The number was read in the primary organization's own page or PDF, through a search excerpt. Good enough to publish with a hedge (about, roughly). |
| **Secondary** | Found only in reputable coverage quoting the primary (AP, NPR, trade press, aggregators). Publish hedged, and check the primary link before stating it as exact. |
| **Computed** | Simple arithmetic done on cited inputs, not a published figure. The inputs are named. |
| **Pre 2024** | The underlying data is older than 2024. The bank says so in the sentence where it matters. |

Nothing in the bank uses a figure the research flagged as unverified. The
figures that were deliberately left out are listed at the bottom.

## Sources by topic

| Topic | Figure in the bank | Source | Period | Label | Link |
|---|---|---|---|---|---|
| Paycheck to Paycheck | About two thirds live paycheck to paycheck; about 24% struggling to pay bills | PYMNTS Intelligence, The American Paycheck 2026 | Jan 2026 | Primary excerpt | https://www.pymnts.com/study_posts/the-american-paycheck-2026-annual-edition-navigating-paycheck-to-paycheck-living-in-the-age-of-disruption/ |
| Paycheck to Paycheck | About 24% of households spend more than 95% of income on necessities | Bank of America Institute, Consumer Checkpoint | 2025 data, reported Nov 2025 | Secondary | https://institute.bankofamerica.com/ |
| Paycheck to Paycheck, Starting From Zero | 59% had a major unexpected expense; 63% could cover $400 | Federal Reserve Board, Economic Well-Being of U.S. Households in 2025 (SHED) | Fielded Oct 2025, published May 2026 | Primary excerpt | https://www.federalreserve.gov/publications/report-economic-well-being-us-households.htm |
| Starting From Zero | 46% could cover three months; 19% have neither savings nor card debt | Bankrate, 2026 Annual Emergency Savings Report | Dec 2025 fieldwork, Feb 2026 | Primary excerpt | https://www.bankrate.com/banking/savings/emergency-savings-report/ |
| Starting From Zero | $250 to $749 in savings cuts missed housing payments and evictions | Urban Institute, Thriving Residents, Thriving Cities | 2009 to 2012 SIPP data | Pre 2024, primary excerpt | https://www.urban.org/research/publication/thriving-residents-thriving-cities-family-financial-security-matters-cities |
| Credit Card Interest | About 21% to 22% on cards carrying a balance in 2026; about 17% in 2019 | Federal Reserve Board, G.19 Consumer Credit (accounts assessed interest) | Feb 2026 reading 21.52%; 2019 average 16.98% | Primary excerpt (2026 monthly readings via FRED based trackers, hedged to a range) | https://www.federalreserve.gov/releases/g19/current/ |
| Credit Card Interest | 27.5% on new cards opened in 2024 versus 19.8% ten years earlier | CFPB, The Consumer Credit Card Market | Dec 2025, data through 2024 | Primary excerpt | https://www.consumerfinance.gov/data-research/research-reports/ |
| Credit Card Interest, Money Stress | 47% carry a balance; 61% for a year or more; 22% never expect to pay it off | Bankrate, 2026 Credit Card Debt Survey | Dec 2025 fieldwork, Jan 2026 | Primary excerpt | https://www.bankrate.com/credit-cards/news/credit-card-debt-survey/ |
| Credit Card Interest | $8 late fee cap vacated | US District Court, N.D. Texas, as reported by AP | April 15, 2025 | Secondary | https://apnews.com/ |
| Credit Card Interest | $5,000 at 22% costs about $1,100 a year | Arithmetic: 5,000 x 0.22 | n/a | Computed | n/a |
| The Minimum Payment Trap | $5,000 at 22%: about 19 years and more than $8,000 at the minimum; a little over 4 years and about $2,800 at $150 a month | Arithmetic with a 1% plus interest minimum and a $25 floor | n/a | Computed | n/a |
| The Minimum Payment Trap | 15% of general purpose and 20% of store cardholders paid only the minimum at some point in 2024 | CFPB, The Consumer Credit Card Market | Dec 2025 | Primary excerpt (counts anyone who paid the minimum at least once in the year) | https://www.consumerfinance.gov/data-research/research-reports/ |
| Buy Now Pay Later | 16% used it; 11% had an autopay overdraft; about one in four paid late | Federal Reserve Board, SHED 2025 fact sheet | May 2026 | Primary excerpt (late share hedged, sources vary 24% to 26%) | https://www.federalreserve.gov/publications/report-economic-well-being-us-households.htm |
| Buy Now Pay Later | 63% had more than one loan at once in 2022 | CFPB, Consumer Use of Buy Now, Pay Later and Other Unsecured Debt | Jan 2025, 2022 data | Pre 2024 data, primary excerpt | https://www.consumerfinance.gov/data-research/research-reports/ |
| Medical Bills, Health Coverage | 27% of adults have family medical debt; 26% of the insured | Urban Institute, Well-Being and Basic Needs Survey | Dec 2025 | Secondary | https://www.urban.org/ |
| Medical Bills | Paid and under $500 medical collections off credit reports; one year wait | CFPB blog on bureau policy changes | 2022 to 2023 policies, still in effect | Primary excerpt | https://www.consumerfinance.gov/about-us/blog/ |
| Medical Bills | CFPB medical debt rule vacated July 11, 2025 | US District Court, E.D. Texas, as reported by STAT News | July 2025 | Secondary | https://www.statnews.com/ |
| Medical Bills | 240 days to apply for assistance; 30 days notice; nonprofit hospital duties | Internal Revenue Code section 501(r); 26 CFR 1.501(r)-6 | Current | Primary excerpt | https://www.irs.gov/charities-non-profits/financial-assistance-policy-and-emergency-medical-care-policy-section-501r4 |
| Student Loans | About 42.3 million borrowers; more than $1.7 trillion | Federal Student Aid, portfolio summary | June 30, 2026 | Secondary (FSA figures via aggregators) | https://studentaid.gov/data-center/student/portfolio |
| Student Loans | Collections resumed May 5, 2025 | US Department of Education announcement, as reported by NPR and Reuters | April to May 2025 | Secondary | https://www.ed.gov/ |
| Student Loans | SAVE ended by court order March 2026; 90 days from July 1, 2026 to choose a plan | Eighth Circuit, Missouri v. Department of Education, as summarized by TICAS | March 2026 | Secondary | https://ticas.org/ |
| Student Loans | Repayment Assistance Plan: 1% to 10% of income, $10 minimum, from July 1, 2026 | Public Law 119-21, as summarized by Bankrate and state regulators | Signed July 4, 2025 | Secondary | https://www.congress.gov/ |
| Car Payments | $765 new and $542 used average payment | Experian, State of the Automotive Finance Market Q2 2026 | Aug 2026 | Primary excerpt | https://www.experian.com/automotive/auto-credit-webinar-form |
| Car Payments | 20% pay $1,000 or more; nearly one in four at 84 months or longer | Edmunds Q1 and Q2 2026 data, as reported by AP | 2026 | Secondary | https://www.edmunds.com/industry/press/ |
| Car Payments | 29.6% of trade ins underwater; average $6,884; average term about 70 months | Edmunds Q2 2026 negative equity release; Edmunds financing data | July and Oct 2026 | Primary excerpt (term figure secondary) | https://www.edmunds.com/industry/press/ |
| Rent and Housing Costs, Where the Money Goes | 22.7 million renter households (49%) cost burdened; 12.1 million (26%) severely | Harvard Joint Center for Housing Studies, America's Rental Housing 2026 and State of the Nation's Housing 2026 | 2024 data | Secondary | https://www.jchs.harvard.edu/ |
| Rent and Housing Costs, Life Insurance Amounts | Typical asking rent $1,932 | Zillow Observed Rent Index, September 2026 report | Sept 2026 | Primary excerpt | https://www.zillow.com/research/ |
| Rent and Housing Costs, Home Buying | Median existing home $417,500 | National Association of Realtors, Existing-Home Sales | Sept 2026 | Primary excerpt | https://www.nar.realtor/research-and-statistics |
| Rent and Housing Costs, Home Buying, Prices vs Paychecks | Median household income $87,460 in 2025; about 2.5% above 2019 | US Census Bureau, Income in the United States: 2025 (P60-289); AP coverage for the 2019 comparison | Sept 2026 | Primary excerpt (2019 comparison secondary) | https://www.census.gov/library/publications/2026/demo/p60-289.html |
| Rent and Housing Costs, Home Buying | $109,796 needed to afford the median home | Redfin affordability analysis | June 2026 data, Aug 2026 | Primary excerpt | https://www.redfin.com/news/ |
| Rent and Housing Costs, Home Buying | First time buyer median age 40; 21% share | National Association of Realtors, 2025 Profile of Home Buyers and Sellers | Nov 2025 | Primary excerpt | https://www.nar.realtor/research-and-statistics/research-reports/highlights-from-the-profile-of-home-buyers-and-sellers |
| Renting vs Buying | Renting cheaper in all 50 largest metros; $2,768 mortgage versus about $2,000 rent | Bankrate, Rent vs. Buy Affordability Study 2025 | Feb 2025 data | Primary excerpt | https://www.bankrate.com/real-estate/rent-vs-buy-affordability-study/ |
| Renting vs Buying | 30 year mortgage 7.32% versus 6.19% a year earlier | Freddie Mac, Primary Mortgage Market Survey | Week of Oct 22, 2026 | Primary excerpt | https://www.freddiemac.com/pmms |
| Renting vs Buying, Home Buying | Selling costs 8% to 10%; closing costs 2% to 5% | Bankrate and HomeLight cost of selling guides; industry rule of thumb | Current | Secondary, rule of thumb | https://www.bankrate.com/real-estate/how-much-does-it-cost-to-sell-house/ |
| Where the Money Goes, Prices vs Paychecks | Housing 33.4%, transportation 17.0%, food 12.9% of spending | BLS, Consumer Expenditure Survey 2024 | Dec 2025 | Primary excerpt | https://www.bls.gov/cex/ |
| Prices vs Paychecks | CPI up 3.7% in the year to Sept 2026; index up roughly 30% since Jan 2020 | BLS, Consumer Price Index, September 2026 (index 336.940 versus 257.971 in Jan 2020) | Oct 2026 | Primary excerpt; the cumulative figure is Computed | https://www.bls.gov/cpi/ |
| Prices vs Paychecks, Raises and Job Changes | Real average hourly earnings down 0.7% in the year to Sept 2026 | BLS, Real Earnings, September 2026 | Oct 2026 | Primary excerpt | https://www.bls.gov/news.release/realer.toc.htm |
| Childcare Costs, Family and Kids, Life Insurance Amounts | $13,184 average price; 10% and 33% of median income; more than rent for two kids in all 47 reporting states | Child Care Aware of America, Child Care in America: 2025 Price and Supply | May 2026, 2025 data | Primary excerpt (state count secondary) | https://www.childcareaware.org/price-landscape/ |
| Childcare Costs | 60% call childcare a top expense; nearly one in five households had someone quit | Third Way / GBAO, Understanding Child Care in America | June 2026 | Secondary | https://www.thirdway.org/ |
| Childcare Costs | Dependent care FSA limit $7,500 as of 2026 | Public Law 119-21 (raised the limit from $5,000 for tax years after 2025) | 2026 | Secondary | https://www.congress.gov/ |
| Bank Fees | FDIC national average savings rate 0.38%; online accounts around 4% | FDIC, National Rates and Rate Caps (via FRED); Bankrate rate tables | July 2026 | Primary excerpt (online rate is a market range) | https://www.fdic.gov/resources/bankers/national-rates/ |
| Bank Fees | $10,000 earns about $38 versus about $400 | Arithmetic on the two rates above | n/a | Computed | n/a |
| Bank Fees | Average overdraft fee $26.77; 94% of accounts charge one | Bankrate, 2025 Checking Account and ATM Fee Study | 2025 | Primary excerpt | https://www.bankrate.com/banking/checking/checking-account-survey/ |
| Bank Fees | $5 overdraft cap repealed May 9, 2025 | Congressional Research Service, Congress Repeals CFPB's Overdraft Rule (IN12513) | Sept 2025 | Primary excerpt | https://crsreports.congress.gov/ |
| Bank Fees | $250,000 FDIC and NCUA insurance limits | FDIC, Understanding Deposit Insurance; NCUA | Current | Primary excerpt | https://www.fdic.gov/resources/deposit-insurance/ |
| Bank Fees | About one in twenty households unbanked (4.2%) | FDIC, 2023 National Survey of Unbanked and Underbanked Households | Nov 2024, 2023 data | Pre 2024 data, primary excerpt | https://www.fdic.gov/household-survey |
| Getting Out of Debt | Card balances $1.263 trillion | Federal Reserve Bank of New York, Quarterly Report on Household Debt and Credit, Q2 2026 | Aug 2026 | Primary excerpt | https://www.newyorkfed.org/microeconomics/hhdc |
| Getting Out of Debt | Debt management plans 3 to 5 years; fee waivers by income | National Foundation for Credit Counseling; CFPB Ask CFPB | Current | Primary excerpt | https://www.nfcc.org/resources/debt-management-plans/ |
| Getting Out of Debt | Small balance first raises completion (about 6,000 clients) | Gal and McShane, Journal of Marketing Research, 2012, via Kellogg Insight | 2012 | Pre 2024, secondary | https://insight.kellogg.northwestern.edu/article/to_beat_debt_consider_starting_small |
| Side Income | 9.0 million multiple jobholders, 5.5% of the employed | BLS, The Employment Situation, September 2026, Table A-16 | Oct 2026 | Primary excerpt | https://www.bls.gov/news.release/empsit.toc.htm |
| Side Income | 27% have a side hustle; median $200 a month | Bankrate, Side Hustle Survey 2025 | June 2025 | Primary excerpt | https://www.bankrate.com/credit-cards/news/side-hustles-survey/ |
| Raises and Job Changes | Job switchers 5.0% versus stayers 3.6% | Federal Reserve Bank of Atlanta, Wage Growth Tracker | Aug 2026 data | Secondary | https://www.atlantafed.org/chcs/wage-growth-tracker |
| Benefits, Retirement Planning | Median 401(k) $44,115, average $167,970; most common match 50% on 6%; a little over 40% collect the full match | Vanguard, How America Saves 2026; Vanguard, Better match formulas for 401(k) plans | June and July 2026 | Primary excerpt | https://institutional.vanguard.com/how-america-saves/ |
| Benefits, Disability Protection | 59% access to employer life insurance; 44% short term and 37% long term disability | BLS, Employee Benefits in the United States, March 2026 | Sept 2026 | Primary excerpt | https://www.bls.gov/ebs/ |
| Retirement Planning | 72% access to a retirement plan, 52% participate | BLS, Employee Benefits in the United States | March 2025 edition (check the 2026 table) | Primary excerpt | https://www.bls.gov/ebs/ |
| Money Stress, Talking to Family | 71% call money a significant source of stress, up from 63% in 2023 | American Psychological Association, Stress in America 2026 | Oct 2026 | Primary excerpt | https://www.apa.org/news/press/releases/stress |
| Scams | 3 million reports; $15.9 billion lost; imposter scams more than $3.5 billion | FTC testimony to the Joint Economic Committee; FTC 2025 data | March and June 2026 | Primary excerpt | https://www.ftc.gov/news-events/data-visualizations/data-spotlight |
| Scams | 20s lose money in 44% of reports versus 24% for 70s | FTC, Consumer Sentinel Network Data Book 2024 | 2024 data | Primary excerpt | https://www.ftc.gov/reports |
| Scams | True 2024 losses could be as high as $195.9 billion | FTC press release and JEC testimony | March 2025 | Primary excerpt | https://www.ftc.gov/news-events/news/press-releases |
| Building Credit | No credit drivers pay 49% to 53% more; three states ban credit based pricing | WalletHub quote tests; Consumer Federation of America | Undated in excerpts | Secondary (conflicting 49% versus 53%, both given) | https://wallethub.com/ |
| Building Credit | VantageScore 4.0 approved July 2025 | Federal Housing Finance Agency announcement, VantageScore summary | July 2025 | Secondary | https://www.fhfa.gov/ |
| Building Credit | FICO 300 to 850; payment history about 35% | FICO, How scores are calculated | Current | Primary (long standing) | https://www.myfico.com/credit-education/whats-in-your-credit-score |
| Term Life Insurance | 52% own life insurance; 38% (about 92 million) need more; about three quarters overestimate cost; under 30s by 5 to 6 times | LIMRA and Life Happens, 2026 Insurance Barometer Study | Jan 2026 fieldwork | Primary excerpt (the 2025 release said 10 to 12 times for under 30s; the 2026 figure is used) | https://www.limra.com/ |
| Term Life Insurance, When Money Is Tight | $29.56 a month (man) and $23.10 (woman), $500,000, 20 year term, age 30 | Policygenius, Life Insurance Price Index | Oct 2025 | Primary excerpt | https://www.policygenius.com/life-insurance/life-insurance-price-index/ |
| When Money Is Tight | Cost cited by 46% of people with a coverage gap | Life Happens / LIMRA, 2025 Insurance Barometer | 2025 | Primary excerpt | https://lifehappens.org/ |
| Family and Kids, Life Changes | About 65% of employed Americans rely on workplace life insurance | LIMRA, 2024 Life Insurance Awareness Month workplace fact sheet | 2024 | Primary excerpt | https://www.limra.com/ |
| Disability Protection | 24% (about 1 in 4) of 20 year olds disabled before retirement age | Social Security Administration, Office of the Chief Actuary, Actuarial Note 2026.6; SSA Basic Facts | 2026 | Primary excerpt | https://www.ssa.gov/oact/NOTES/ |
| Disability Protection | Average SSDI benefit $1,636.47; about 7 million disabled workers | SSA, Monthly Statistical Snapshot, September 2026 | Oct 2026 | Primary excerpt | https://www.ssa.gov/policy/docs/quickfacts/stat_snapshot/ |
| Health Coverage | Out of pocket maximum $9,200 individual and $18,400 family for 2025 | HHS Notice of Benefit and Payment Parameters for 2025 | 2025 plan year | Primary (long standing) | https://www.cms.gov/ |
| Estate Planning | Federal estate tax exemption $13.99 million in 2025, $15 million in 2026 | IRS inflation adjustments; Public Law 119-21 | 2025 and 2026 | Primary (long standing) | https://www.irs.gov/ |
| Several | About 1 in 3 adults has a will or an advance directive; children on a parent's plan to 26; 7 tax brackets 10% to 37%; term conversion to 65 or 70; waiver of premium 90 days to 6 months | Carried over from the earlier bank: Caring.com and Gallup will surveys, the Affordable Care Act, IRS bracket tables, standard policy terms | Long standing | Primary (long standing) | n/a |

## Figures deliberately left out

The research flagged these as unverified or conflicting, so the bank does
not state them. If John wants to use one, check the primary page first.

- The exact 2026 average card rate (22.36% for August 2026 appeared only on FRED based trackers). The bank says about 21% to 22%.
- The 2010 average card rate. No reachable source confirmed it.
- Edmunds' $787 average new car payment for Q3 2026 (trade press only). The bank uses Experian's $765 for Q2 2026.
- The share of card balances 90 or more days late (12.9%).
- 9.3 million defaulted student loan borrowers and $234 billion in default (aggregators only). The bank says millions.
- The date wage garnishment for student loans actually restarts (sources conflict between fall 2026 and 2027). The bank says the timing keeps moving.
- The exact 2025 share of buy now pay later users who paid late (24%, 26%, or slightly more than one quarter). The bank says about one in four.
- Any 2025 or 2026 KFF medical debt survey (none found; the Urban Institute figure is used instead).
- Any national average for center based infant care (Child Care Aware does not publish one).

## How to update a number

1. Find the row above and open the link.
2. Change the sentence in `src/server/seed-facts.ts` under that topic's `stats` (or `facts`).
3. Update the row here with the new period.
4. Run `bun test src/lib` from the `financial-dm` folder. The topic bank test checks that every stat still carries a number and that the house style holds.
