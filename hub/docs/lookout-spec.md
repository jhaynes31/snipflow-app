# The Lookout: a personal job researcher, career assistant, and application manager

2026-10-29. Built from Jen's master project plan as a module of The Shire. Route `/lookout`, module id `lookout`, Convex tables prefixed `lo`.

The goal, from the plan: **the right job, not more jobs.** The Lookout acts like a personal recruiter for the one of them who is looking for work. It learns his real history, looks for fully remote work that fits his life on the road, rejects anything that breaks a hard requirement, checks what can't be read from a listing, ranks what's left, and drafts truthful, tailored documents. He approves and submits every application himself.

## What Phase One does, screen by screen

| Screen | What it does |
| --- | --- |
| **Overview** (`/lookout`) | Setup progress, Search now, top matches (pass every requirement), promising jobs that need a fact checked, upcoming interviews and follow ups, and counts for every stage (new, waiting for review, saved, preparing, ready for approval, approved, submitted, interviewing, closed). |
| **Interview** (`/lookout/interview`) | The career intake: 26 questions, one on screen at a time, skippable, saved as he goes, each labeled as about him, a requirement, or a preference. Covers contact lines, channels, complaints resolved, software, writing, admin work, real numbers, education, the two sales jobs, an approved transition answer, the pet sitting business, likes and dislikes, industries, pay, benefits, hours, time zone, contact limits, equipment, and whether health details may ever be shared. |
| **Work history** (`/lookout/history`) | Upload a resume (PDF, Word, or text) to fill it in: each job, its dates, duties, achievements, and tools come in as a draft, and contact lines, tools, and education fill unanswered interview questions, all waiting for him to check and confirm. Nothing the resume doesn't say is added, nothing already there is overwritten, and the file isn't kept. Then one entry per job: employer, title, start and end month, channels, duties, achievements, tools, whether it was sales, and a private note on why it ended. The source of truth for every resume. |
| **Assistant** (`/lookout/assistant`) | Plain instructions ("I uploaded the resume, but these two jobs are no longer current; both ended June 2025") are put in the right place at once: work history, interview answers, standing notes for the writer, or a job's status and notes. Each reply lists exactly what it changed, with Undo. Anything unclear (which job, what date) is asked, never guessed, and every change is checked against what exists before it's made. History and answers changed by the partner still wait for the owner's confirmation. |
| **Jobs** (`/lookout/jobs`) | Every job in one view at a time (best matches, needs checking, each stage, set aside with the reason), best score first. |
| **Job** (`/lookout/jobs/<id>`) | Warnings; each hard requirement as pass, fail, or unknown with the reason; the score and its parts, strengths, gaps, and unknowns; every fact with its source and the listing's own words; "Read the listing for me"; "I checked this" to verify a fact; a ready-to-send note asking the recruiter only what's still unknown; the resume, cover letter, and application answers with their checks; approval; submission; interviews, follow ups, and notes; the listing as found. |
| **Add a job** (`/lookout/add`) | Paste a job found anywhere (Indeed, LinkedIn, an email). It gets every check. |
| **Settings** (`/lookout/settings`) | Minimum guaranteed hourly pay ($25), maximum weekly hours (35), home state; ranking weights; scheduled search (off, daily, weekly); extra title words; sources; let his partner help; whether health details may appear in applications; download everything; delete everything. |

## Recommended technology stack (as built)

- **Next.js 16 and React 19** for the screens, inside The Shire's existing shell (one login, one deploy).
- **Convex** for the database, server functions, the scheduled search, and access checks. Every function goes through `requireLookout` in `convex/lookout/data.ts`.
- **Claude** (`claude-opus-5-5`) through the official Anthropic SDK, called only from Convex actions, for drafting documents and reading listings. Structured JSON output in a fixed shape, server side fallback on a refusal (`fallbacks: "default"`), and the key only in Convex's environment (`ANTHROPIC_API_KEY`, the same one the coach uses).
- **Public job posting APIs** (below) for discovery. No scraping.
- **JSZip** in the browser to build the Word file; the browser's print dialog for PDF.

## Architecture

```
Browser (modules/lookout)            Convex (convex/lookout)                         Outside
─────────────────────────            ─────────────────────────                       ───────
Interview, History  ── mutations ──▶ data.ts: gate, answers, roles  ──┐
Add a job           ── mutation  ──▶ data.ts: insertJob ─▶ pure.ts scanListing
Job screen          ── queries   ◀── data.ts: job + rank(facts) (pure.ts)
"Read the listing"  ── action    ──▶ ai.ts readListing ─────────────────────────▶ Claude
"Draft the resume"  ── action    ──▶ ai.ts draftResume ─▶ writing.ts render ────▶ Claude
                                        └─▶ data.ts writeDoc: scrubDashes + reviewDocument
Approve             ── mutation  ──▶ data.ts approve: verdict must be eligible, no blocking issue,
                                        freezes the exact texts in loApplications
"It's submitted"    ── mutation  ──▶ data.ts markSubmitted: needs approval and a confirmation
Search now / cron   ── action    ──▶ discover.ts ─▶ sources.ts parsers ─────────▶ posting APIs
"Is it still open?" ── action    ──▶ discover.ts recheck ─▶ openFromPage ───────▶ listing page
```

The rules live in pure, unit-tested files: `pure.ts` (facts, hard filters, ranking, listing scanner, duplicates, statuses, recruiter questions), `writing.ts` (the dash rule, the resume renderer, the document review), `sources.ts` (sources and parsers), `prompts.ts` (the writer's instructions and answer shapes), `intake.ts` (the interview). `tests/lookout.test.ts` runs the plan's acceptance tests against them.

## Job sources and authorized integrations

| Source | How | Why |
| --- | --- | --- |
| Employer boards on **Greenhouse**, **Lever**, **Ashby** | Public posting APIs (`boards-api.greenhouse.io`, `api.lever.co/v0/postings`, `api.ashbyhq.com/posting-api`) | The employer's own official listing and application page. Highest priority. Add any employer by its board name. A few remote first examples are listed and off by default. |
| **Remotive** | Public API (`remotive.com/api/remote-jobs`) | Specialist remote board. Its terms ask for a link back (shown on each job) and a few requests a day. |
| **Himalayas** | Public API (`himalayas.app/jobs/api`) | Specialist remote board with salary and location restrictions. |
| **Indeed, LinkedIn, Glassdoor, ZipRecruiter** | Pasted by hand | Their terms don't allow automated access. Add a job runs every check on a pasted listing, and asks for the employer's own page when there is one. |

Searches run at most once every twenty hours, keep only titles in his discovery categories (documentation, operations, back office, order processing, ticket and email support, quality, process improvement, records and data, content review, onboarding administration, claims and benefits, CRM data, coordination, administration), drop sales titles and other-country listings before storing anything, and keep at most sixty per search, newest first. **Before relying on the scheduled search, run Search now once and read the note it leaves; it names any source that didn't answer.** The source endpoints were written against each API's published format and tested with sample answers, not live calls from the build machine.

Later additions worth considering: USAJOBS (free key; federal remote roles), Adzuna (free key; wide coverage, but an aggregator), Workable and SmartRecruiters boards (public posting endpoints, same pattern as Greenhouse).

## Verification and matching methodology

**Facts with sources.** A job is judged on 24 facts (fully remote, hires in West Virginia, works while traveling, works internationally, no office or relocation, guaranteed base pay, pay range and unit, commission only, hours, a confirmed reduced schedule, W2 or 1099, benefits, cold calling, sales targets, phone work, meetings, live queues, how much customer contact, schedule kind, weekends or on call, legitimacy, still open). Each fact records yes, no, or unknown; a value; where it came from (the listing's wording, the assistant's reading with a quote, or **verified** by a person with who said it); and the words behind it. A guess never overwrites a verified fact.

**Hard filters first.** Ten mandatory checks, each pass, fail, or unknown: remote from West Virginia; works while traveling; at least $25 an hour guaranteed (salaries are divided by the stated hours, never by an assumed 40); 35 hours or fewer (a 40 hour listing passes only if the employer confirmed a reduced schedule; a listing that only says "full time" is a question for the recruiter, not a rejection); not commission only; no cold calling; no office or relocation; acceptable contact and schedule (no sales targets, heavy phone work, frequent meetings, or constant live contact); a real employer; still open. **Any fail sets the job aside. Any unknown sends it to "needs checking". Only all passes are ranked**, and only those can be approved.

**Ranking.** Jobs that pass get a score out of 100 from configurable weights (starting at the plan's: schedule 20, little customer contact 20, location independence 20, guaranteed pay and benefits 15, independent work 15, skills 10). Contract pay is compared at its employee equivalent (less the 7.65% extra payroll tax) and the gap is named. A rejected job has no score at all.

**Independent work evidence.** The Lookout looks for written evidence (async, documented processes, few meetings, autonomy, results based, focus time, accommodations, clear priorities) and reports what it found. It never labels an employer neurodivergent friendly on its own.

**Warnings.** Gift cards, upfront fees, fake checks for equipment, banking logins, chat app interviews, Social Security numbers before an offer, reshipping or money moving, and too-good earnings promises mark the employer as not legitimate. Customer service titles with sales duties and "earning potential" pay are flagged as misleading.

**Asking.** For every requirement still unknown, the job screen writes a short, polite note to the recruiter asking just those questions (never personal or health details). When they answer, he marks each fact verified with who said it.

**Freshness.** Each job records its original URL, other places it was seen, the date found, the posting date, the deadline, the last verification, and the last check. Rechecks treat a 404, a 410, or a "position filled" page as closed and note when a listing page changes.

## Documents

- **Resume.** The writer returns only wording: a summary, skills, and bullets per role id. Code assembles the resume in standard sections (Summary, Skills, Experience, Education and Training) with **employer names, titles, and dates taken from his confirmed history exactly**. Plain text, no tables or columns. Downloads as a Word file or prints to PDF.
- **Cover letter.** 250 to 380 words, four short paragraphs, specific to the listing, in his voice.
- **Application answers.** Paste the employer's questions; anything only he can answer (eligibility, salary, start date) comes back as ASK FIRST and blocks approval until he fills it in.
- **The no-dash rule.** Every saved document, drafted or hand edited, is rewritten so no hyphen, en dash, em dash, minus, soft hyphen, or dash separator remains: ranges read "to", clause dashes become commas, known words join ("email", "nonprofit") or split ("follow up", "detail oriented"), phone numbers use dots, dash bullets become bullets. Approval refuses any document that still has one.
- **The review.** Before a document can be approved: no dashes; every number in it appears in his confirmed profile; no health or diagnosis words unless he allowed them; template phrases, repeated openers, and overused words flagged; resume structure and length checked; letter length checked. The writer also returns questions for anything it needed and didn't have, shown above the document.
- **Authenticity, not detector games.** The Lookout makes no promise about AI detection tools. The aim is a truthful application he can comfortably talk through in an interview.

## Applications and status

Status moves by hand only between neighboring stages. **Ready for approval** needs a resume with no blocking issue. **Approve** is his alone, needs every requirement to pass, asks him to confirm he read every document and that it's true, and freezes the exact texts used. **Submitted** is recorded only after approval and only with something that confirms it (a confirmation message or number). A follow up is suggested seven days later. Interviews, follow ups, notes, and how an interview went are kept per job. Nothing is ever submitted to an employer from The Shire.

## Privacy and security

- Each person can have one search, and either can start one for the other (Jen, 2026-10-29: the search is John's; she helps with it and doesn't need her own, but can start one any time). **The partner sees and helps with a search by default**; its owner can turn that off in Settings. A helper can add jobs, check facts, upload a resume, and edit drafts, but interview answers and history they write wait for the owner's confirmation, and approval, privacy settings, export, and deletion stay the owner's. When both searches are open to someone, a switch at the top picks which one is shown. A search started on the wrong account can be given to the partner with everything in it.
- Reached only through signed in Convex functions that check whose search it is, on top of The Shire's two-account login.
- Health details never go into a document unless he turns that on; the review blocks a document that mentions them.
- The private "why it ended" note and the disclosure answer are never sent to the writer.
- Download everything as one JSON file. Delete a search and everything in it in Settings.
- Data sent outside The Shire: his confirmed profile and one listing per draft, to the Claude API; nothing about him to job sites.

## Implementation timeline

| Phase | Scope | Status |
| --- | --- | --- |
| One: the core | Intake, history, discovery from public APIs and pasted jobs, hard filters, verification, ranking, documents with the dash rule and review, approval, submission records, dashboard, export and delete | **Built here.** Next: fill in his real profile, add employers' boards, and run the acceptance walk-through below with real openings. |
| Two: proactive research | Scheduled search, rechecks, change detection, duplicate folding, one quiet notice for strong new matches | **Built, off by default.** Turn on in Settings once Phase One results look right. Add a weekly digest card if wanted. |
| Three: application help | Copy-ready answers and documents (built). Form filling and uploads | Form filling is not built on purpose; see below. |
| Four: career development | Interview preparation from the company and his history, salary research, skills gaps, training ideas, insights from outcomes | Not built. Interview and feedback records are in place to feed it. |

## Estimated costs

**Development.** Phase One as delivered here. For outside quotes on what's left, rough effort: Phase Two polish and a weekly digest, 1 to 2 days; Phase Four interview preparation and salary notes, 3 to 5 days; a browser extension for form filling (Phase Three), 2 to 4 weeks and ongoing upkeep as employer forms change.

**Monthly running costs.**

| Item | Estimate |
| --- | --- |
| Claude, at $4 per million input and $20 per million output tokens: about $0.10 to $0.15 per resume, $0.10 per letter, $0.08 per set of answers or listing read | About $5 to $15 a month for 20 serious applications and 60 listings read |
| Convex and Vercel | Within The Shire's current plans; the Lookout adds a few thousand rows and one daily job |
| Job posting APIs | Free |

## What can't be automated reliably, and the alternative

| Can't be relied on | What the Lookout does instead |
| --- | --- |
| Whether an employer will pay someone in West Virginia, and whether he can work from other states | Reads what the listing says; otherwise writes the question for the recruiter and waits for a verified answer. Never assumes "remote" means either. |
| Whether an employer is legitimate | Flags scam signs and keeps the original employer link; legitimacy is a fact a person verifies (company domain, careers page, real recruiter). |
| Whether a workplace really suits independent, focused work | Reports the evidence in the listing, and the questions about meetings, queues, and schedule. |
| Searching Indeed, LinkedIn, and similar sites | Their terms forbid it; paste listings into Add a job. |
| Filling and submitting employer forms | Every ATS differs and many block automation; he submits on the employer's page with copy-ready documents and answers. |
| Promises about AI detectors | None made. Truthful writing in his own voice, checked against his own facts. |

## Acceptance walk-through (plan, section 16)

Automated in `tests/lookout.test.ts`: finds jobs beyond customer service titles (1); rejects every kind of requirement violation and gives rejected jobs no score (2); West Virginia lists, exclusions, Virginia versus West Virginia, fixed-address rules, and unknown travel (3); sales disguised as service, meetings, live queues, earning potential (4); closed pages, duplicates, scams (5); resumes built from confirmed history only, unsupported numbers blocked, health words blocked, the writer's rules (6); every dash form rewritten without breaking the sentence (7); unknowns go to checking, guesses never beat verified facts, the interview asks one at a time (8); hand moves can't approve or submit (9 to 11); deleting removes every Lookout table (12).

By hand, once his real profile is in: answer the interview; enter and confirm his history; add a few employers' boards and Search now; paste two or three real listings, including one obvious sales role and one with a state list; verify facts for one good match using the recruiter note; draft the resume and letter and read the checks; approve; submit on the employer's page; record the confirmation; download everything; and, on a test account, delete a search.
