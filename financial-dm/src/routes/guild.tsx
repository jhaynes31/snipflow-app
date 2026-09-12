import { createFileRoute } from "@tanstack/react-router";
import InterestForm from "~/components/guild/InterestForm";
import { GUILD_CONFIG, GUILD_FAQ, GUILD_FACT_FIELDS, factLabel, smsLink } from "~/lib/guildConfig";
import { getGuildPublic, type GuildPublic } from "~/server/guild";
import { JOHN_TITLE_LINE } from "~/lib/johnTitles";

/**
 * The Guild Hall (recruiting spec, Section 5.1, as revised by the
 * trust-first amendment): the public careers page at /guild, in the
 * recruiting flyer's look. Its job is to make reaching out feel safe:
 * specific about legitimacy, general about the opportunity. Every role
 * detail is one of John's confirmed trust facts; presentation facts never
 * reach this page. Until all required facts are confirmed, visitors see a
 * "being prepared" page and only a signed-in admin (or a dev build) sees
 * the preview with placeholders and a warning.
 */
export const Route = createFileRoute("/guild")({
  loader: () => getGuildPublic(),
  head: ({ loaderData }) => {
    const live = loaderData?.live ?? false;
    const f = loaderData?.facts ?? {};
    return {
      meta: [
        { title: live ? `${f.roleTitle || "The Guild Is Expanding"} · The Financial DM` : "The Guild Hall · The Financial DM" },
        { name: "description", content: live ? `The Guild is expanding. ${f.industry ? `${f.industry}. ` : ""}${f.roleSummary ?? ""}`.trim().slice(0, 160) : "The Guild Hall is being prepared." },
        ...(live ? [] : [{ name: "robots", content: "noindex, nofollow" }]),
        { property: "og:title", content: "The Guild Is Expanding" },
        { property: "og:image", content: "https://thefinancialdm.com/logo.png" },
      ],
      links: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Work+Sans:wght@400;500;600&display=swap" },
      ],
    };
  },
  component: GuildHallPage,
});

const DISPLAY = { fontFamily: "'Cinzel', Georgia, 'Times New Roman', serif" } as const;
const BODY = { fontFamily: "'Work Sans', 'Segoe UI', system-ui, sans-serif" } as const;

function GuildHallPage() {
  const data = Route.useLoaderData();
  if (!data.live && !data.preview) return <ComingSoon />;
  return <GuildHall data={data} />;
}

function ComingSoon() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-16 bg-[#1c3660] text-center" style={BODY}>
      <div>
        <img src="/logo.png" alt="The Financial DM" className="h-24 w-24 rounded-full mx-auto shadow-xl" />
        <h1 className="mt-6 text-3xl text-[#f3eee3]" style={DISPLAY}>The Guild Hall</h1>
        <p className="mt-2 text-[#c9d3e3]">This page is being prepared. Check back soon.</p>
        <a href="/" className="inline-block mt-6 text-[#c8a24b] underline underline-offset-4">Back to The Financial DM</a>
      </div>
    </main>
  );
}

/** A fact's text, or a clearly marked placeholder when John has not filled it in yet (preview only). */
function Fact({ facts, k, className = "" }: { facts: Record<string, string>; k: string; className?: string }) {
  const v = (facts[k] ?? "").trim();
  if (v) return <p className={`whitespace-pre-line ${className}`}>{v}</p>;
  return (
    <p className={`rounded-md border border-dashed border-[#b8860b] bg-[#fff7dc] px-3 py-2 text-[#7a5a00] text-sm ${className}`} data-fact-todo={k}>
      TODO(John): {factLabel(k)}
    </p>
  );
}

function GuildHall({ data }: { data: GuildPublic }) {
  const f = data.facts;
  const sms = smsLink();
  const has = (k: string) => (f[k] ?? "").trim().length > 0;
  const requiredMissing = data.missing.filter((k) => GUILD_FACT_FIELDS.some((x) => x.key === k && x.required) || GUILD_FAQ.some((x) => x.key === k));
  return (
    <main className="min-h-dvh bg-[#f3eee3] text-[#2a3442]" style={BODY}>
      {!data.live && (
        <div className="bg-[#b8860b] text-[#1c1a12] text-sm px-4 py-2 text-center" data-guild-preview-warning>
          Preview only. {requiredMissing.length} required answer{requiredMissing.length === 1 ? "" : "s"} still need John's words and confirmation before this page goes public. Visitors see a "being prepared" page.
        </div>
      )}

      {/* 1. Hero */}
      <header className="bg-[#1c3660] text-[#f3eee3] border-b-4 border-[#c8a24b]">
        <div className="max-w-5xl mx-auto px-5 py-10 sm:py-14 grid gap-8 sm:grid-cols-[1fr_auto] items-center">
          <div>
            <h1 className="text-4xl sm:text-6xl leading-[1.05] text-[#f3eee3]" style={DISPLAY}>
              The Guild Is Expanding
            </h1>
            <div className="mt-3 text-[#c8a24b] text-lg sm:text-2xl uppercase tracking-wide" style={DISPLAY} data-role-title>
              <Fact facts={f} k="roleTitle" />
            </div>
            <div className="mt-3 h-px w-full max-w-md bg-[#c8a24b]/70" />
            <p className="mt-4 inline-block rounded-full border border-[#c8a24b]/70 px-4 py-1.5 text-xs sm:text-sm tracking-widest uppercase">
              Presented by <span className="text-[#c8a24b] normal-case tracking-normal font-semibold" style={DISPLAY}>{GUILD_CONFIG.presentedBy}</span>
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={sms} className="px-6 py-3 rounded-lg bg-[#c8a24b] hover:bg-[#b8923b] text-[#1c1a12] font-semibold shadow-lg" data-sms-button>
                📱 Text {GUILD_CONFIG.smsKeyword} to {GUILD_CONFIG.recruitPhone}
              </a>
              <a href="#interest" className="px-6 py-3 rounded-lg border-2 border-[#f3eee3]/70 hover:border-[#f3eee3] text-[#f3eee3] font-semibold">
                Request an interview
              </a>
            </div>
          </div>
          <img src="/logo.png" alt="The Financial DM" className="h-32 w-32 sm:h-44 sm:w-44 rounded-full shadow-2xl justify-self-center sm:justify-self-end" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-10 space-y-12">
        <div className="rounded-xl border-2 border-[#1c3660] bg-[#faf7f0] px-5 py-5 flex items-start gap-4">
          <span className="text-3xl leading-none" aria-hidden="true">🎲</span>
          <p className="text-lg sm:text-xl text-[#1c2b3a]">
            Roll initiative on a new career: text <span className="font-bold" style={DISPLAY}>{GUILD_CONFIG.smsKeyword} + (your name)</span> to{" "}
            <a href={sms} className="font-bold text-[#1c3660] underline underline-offset-4" style={DISPLAY}>{GUILD_CONFIG.recruitPhone}</a>
          </p>
        </div>

        {/* 2. What this is */}
        <Section title="What This Is" id="what">
          <div className="space-y-3 text-lg text-[#1c2b3a]">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm uppercase tracking-wider text-[#1c3660]" style={DISPLAY}>The field</span>
              <Fact facts={f} k="industry" className="font-semibold" />
            </div>
            <Fact facts={f} k="roleSummary" />
            <Fact facts={f} k="workArrangement" className="text-base text-[#2a3442]" />
          </div>
        </Section>

        {/* 3. What the conversation covers */}
        <Section title="What the Conversation Covers" id="conversation">
          <div className="rounded-xl border-2 border-[#c8a24b]/60 bg-[#faf7f0] p-5 sm:p-6">
            <p className="text-sm uppercase tracking-wider text-[#1c3660] mb-2" style={DISPLAY}>From John</p>
            <Fact facts={f} k="meetingCovers" className="text-lg text-[#1c2b3a]" />
          </div>
        </Section>

        {/* 4. Straight answers */}
        <Section title="Straight Answers" id="answers">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Answer label="Does it cost anything to interview?"><Fact facts={f} k="costToInterview" /></Answer>
            {has("recruitCosts") && <Answer label="What do recruits pay for to get started?"><Fact facts={f} k="recruitCosts" /></Answer>}
            <Answer label="How is it paid?"><Fact facts={f} k="payBasis" /></Answer>
            <Answer label="What is the interview like?"><Fact facts={f} k="interviewFormat" /></Answer>
            <Answer label="Is a license required?">
              <Fact facts={f} k="licensingRequired" />
              {has("investmentPathExists") && <Fact facts={f} k="investmentPathExists" className="mt-2" />}
            </Answer>
            {has("statesServed") && (
              <Answer label="Where can recruits work?"><Fact facts={f} k="statesServed" /></Answer>
            )}
          </dl>
        </Section>

        {/* 5. Meet John */}
        <Section title="Meet John" id="john">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <img src="/logo.png" alt="" className="h-20 w-20 rounded-full shadow" />
            <div className="space-y-2">
              <div className="text-xl text-[#1c3660]" style={DISPLAY} data-john-name>
                <Fact facts={f} k="johnFullName" />
              </div>
              <p className="text-[#2a3442]" data-john-titles>{JOHN_TITLE_LINE} · The Financial DM, a division of {GUILD_CONFIG.presentedBy}</p>
              {has("licenseLookup") && (
                <a href={f.licenseLookup} target="_blank" rel="noreferrer" className="inline-block text-[#1c3660] underline underline-offset-4">
                  Verify John's license ↗
                </a>
              )}
            </div>
          </div>
        </Section>

        {/* 6. Requirements */}
        <Section title="Quest Requirements" id="requirements">
          <ul className="grid gap-3 sm:grid-cols-2">
            {GUILD_CONFIG.requirements.map((r) => (
              <li key={r.id} className="flex items-center gap-4 rounded-xl border border-[#1c3660]/20 bg-[#faf7f0] px-4 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rotate-45 rounded-md bg-[#1c3660] text-[#c8a24b] text-xs font-bold">
                  <span className="-rotate-45">{r.icon}</span>
                </span>
                <span className="text-lg text-[#1c2b3a]">{r.text}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* 7. FAQ */}
        <Section title="Fair Questions" id="faq">
          <dl className="divide-y divide-[#1c3660]/15 rounded-xl border border-[#1c3660]/20 bg-[#faf7f0]">
            {GUILD_FAQ.map((q) => (
              <div key={q.key} className="px-5 py-4">
                <dt className="font-semibold text-[#1c3660]">{q.question}</dt>
                <dd className="mt-1 text-[#2a3442]">
                  <Fact facts={f} k={q.key} />
                  {q.key === "faq_legit" && has("licenseLookup") && (
                    <a href={f.licenseLookup} target="_blank" rel="noreferrer" className="inline-block mt-1 text-[#1c3660] underline underline-offset-4 text-sm">Look up John's license ↗</a>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* 9. Fit quiz teaser: only once John has approved the quiz copy */}
        {(f.fitQuizApproved === "yes" || !data.live) && (
          <div className="rounded-xl border-2 border-[#c8a24b]/60 bg-[#faf7f0] p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4" data-fit-quiz-teaser>
            <div>
              <p className="text-xl text-[#1c3660]" style={DISPLAY}>Not sure yet?</p>
              <p className="text-[#2a3442]">Take the 2-minute quiz. Seven questions about how you like to work, nothing about you personally.</p>
            </div>
            <a href="/guild/quiz" className="px-5 py-3 rounded-lg bg-[#1c3660] hover:bg-[#14294a] text-white font-semibold">🎲 Is This Quest for You?</a>
          </div>
        )}

        {/* 8. Interest form */}
        <Section title="Request an Interview" id="interest">
          <p className="mb-5 text-[#2a3442]">Prefer a form? John reads every one himself and replies personally, usually by text or phone.</p>
          <div className="rounded-xl border-2 border-[#1c3660]/20 bg-[#faf7f0] p-5 sm:p-6">
            <InterestForm />
          </div>
        </Section>
      </div>

      <footer className="bg-[#1c3660] border-t-4 border-[#c8a24b] text-[#f3eee3]">
        <div className="max-w-5xl mx-auto px-5 py-8 text-center space-y-2">
          <p className="text-2xl text-[#f3eee3]" style={DISPLAY}>The Financial DM</p>
          <p className="text-[#c8a24b] text-sm uppercase tracking-wide" style={DISPLAY}>"{GUILD_CONFIG.tagline}"</p>
          <p className="text-xs text-[#c9d3e3] pt-2">Join the party · The Financial DM · A division of {GUILD_CONFIG.presentedBy}</p>
        </div>
      </footer>
    </main>
  );
}

function Section({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="flex items-center gap-4 mb-5">
        <h2 className="text-2xl sm:text-3xl text-[#1c3660]" style={DISPLAY}>{title}</h2>
        <div className="h-px flex-1 bg-[#c8a24b]" />
      </div>
      {children}
    </section>
  );
}

function Answer({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1c3660]/20 bg-[#faf7f0] p-5">
      <dt className="text-[#1c3660] font-semibold mb-2" style={DISPLAY}>{label}</dt>
      <dd className="text-[#2a3442]">{children}</dd>
    </div>
  );
}
