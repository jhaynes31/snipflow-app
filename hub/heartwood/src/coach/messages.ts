import type { CoachTone } from '@/domain/types';

/**
 * Motivation library (Section 11.4). 100+ messages tagged by moment and tone.
 * Language rules (11.6) apply to every line: no shaming, no drill-sergeant, no
 * body-shaming, feedback is information, never guilt about missed days.
 */

export type Moment = 'pre-session' | 'mid-set' | 'post-session' | 'milestone' | 'comeback' | 'quit' | 'rest' | 'sabbath' | 'form' | 'gap-why' | 'word' | 'small' | 'freestyle';
export type Theme = 'perfectionism' | 'overthinking' | 'shame' | 'small-steps' | 'scripture' | 'rest' | 'identity';
export type Speaker = 'coach' | 'pt';

export interface Message {
  id: string;
  moment: Moment;
  tone: CoachTone | 'any';
  speaker: Speaker | 'any';
  text: string;
  /** {{n}} session count, {{name}} user name, {{why}} her why. */
  faith?: boolean;
  theme?: Theme;
  /** Scripture reference, shown after the text. */
  ref?: string;
}

let i = 0;
const m = (moment: Moment, tone: Message['tone'], speaker: Message['speaker'], text: string, faith = false, theme?: Theme): Message => ({ id: `m${++i}`, moment, tone, speaker, text, faith, theme });
/** Scripture line: always faith-track only. */
const v = (moment: Moment, text: string, ref: string, theme: Theme = 'scripture'): Message => ({ id: `m${++i}`, moment, tone: 'any', speaker: 'coach', text, faith: true, theme, ref });

export const MESSAGES: Message[] = [
  // ---------------- Pre-session ----------------
  m('pre-session', 'gentle', 'coach', 'You showed up. That is the whole hard part. The rest is just following along.'),
  m('pre-session', 'gentle', 'coach', 'Nothing to decide today. I have it planned. You just move with me.'),
  m('pre-session', 'gentle', 'coach', 'However today feels, this session meets you there. Easy version is one tap away if you need it.'),
  m('pre-session', 'gentle', 'pt', 'We will warm the joints first, gently. Your body will tell us when it is ready.'),
  m('pre-session', 'gentle', 'coach', 'Your only job is to be here. Consider it done.'),
  m('pre-session', 'gentle', 'coach', 'You are someone who shows up for her body. Today is another piece of proof.'),
  m('pre-session', 'fierce', 'coach', 'You are here. That is the choice that matters, and you already made it.'),
  m('pre-session', 'fierce', 'coach', 'This is you, fighting for yourself. Not against anything. For.'),
  m('pre-session', 'fierce', 'coach', 'Every rep today is a vote for the woman you are becoming. Let us cast a few.'),
  m('pre-session', 'fierce', 'coach', 'Strong is built one calm session at a time. This is one of them.'),
  m('pre-session', 'fierce', 'pt', 'Your joints are about to get exactly what they have been asking for.'),
  m('pre-session', 'calm', 'coach', 'Same structure as always. Warm-up, work, cool-down. What is next is always on the screen.'),
  m('pre-session', 'calm', 'coach', 'No surprises today. Follow the steps and let the timer do the counting.'),
  m('pre-session', 'calm', 'pt', 'We start supported and stay steady. Nothing fast, nothing sudden.'),
  m('pre-session', 'calm', 'coach', 'Steady is the goal. Not perfect, not intense. Steady.'),
  m('pre-session', 'any', 'coach', 'This is session {{n}}. Each one is a brick.'),
  m('pre-session', 'any', 'coach', 'Remember why: "{{why}}"'),
  m('pre-session', 'any', 'coach', 'Rest is built in. You never have to earn the breaks; they are already in the plan.'),
  m('pre-session', 'any', 'pt', 'Set the phone where you can see it without craning your neck. Then let us begin.'),
  m('pre-session', 'any', 'coach', 'You are stewarding a body you were given. Showing up is a way of saying thank you.', true),
  m('pre-session', 'any', 'coach', '"Do not be anxious about anything." Let us just take the next step, together.', true),
  m('pre-session', 'any', 'coach', 'This is partnership: you bring the willingness, He brings the strength.', true),

  // ---------------- Mid-set cues ----------------
  m('mid-set', 'any', 'coach', 'Breathe.'),
  m('mid-set', 'any', 'coach', 'Nice control.'),
  m('mid-set', 'any', 'coach', 'Two more.'),
  m('mid-set', 'any', 'coach', 'Slow on the way down.'),
  m('mid-set', 'any', 'coach', 'That is it. Steady.'),
  m('mid-set', 'any', 'coach', 'Good. Keep the rhythm.'),
  m('mid-set', 'any', 'pt', 'Head stays resting.'),
  m('mid-set', 'any', 'pt', 'Neck long.'),
  m('mid-set', 'any', 'pt', 'Knees track over the toes.'),
  m('mid-set', 'any', 'pt', 'Light hand on the counter.'),
  m('mid-set', 'any', 'pt', 'Soft knee, do not lock it.'),
  m('mid-set', 'any', 'pt', 'Feel the whole foot.'),
  m('mid-set', 'gentle', 'coach', 'You are doing beautifully.'),
  m('mid-set', 'gentle', 'coach', 'Easy does it. Quality over speed.'),
  m('mid-set', 'fierce', 'coach', 'Own this rep.'),
  m('mid-set', 'fierce', 'coach', 'Strong. Again.'),
  m('mid-set', 'calm', 'coach', 'Steady breath. Steady pace.'),
  m('mid-set', 'calm', 'coach', 'Halfway. Same tempo.'),

  // ---------------- Form tips (from cues) ----------------
  m('form', 'any', 'pt', 'Information, not judgment: check the cue on screen and adjust if it helps.'),
  m('form', 'any', 'pt', 'If the neck is working, the set-up needs a tweak. Let the bigger muscles do it.'),
  m('form', 'any', 'pt', 'Slower usually fixes it. Try the next rep at half speed.'),
  m('form', 'any', 'pt', 'Range you control beats range you force.'),

  // ---------------- Post-session ----------------
  m('post-session', 'gentle', 'coach', 'Done. Whatever else today holds, you already did this for yourself.'),
  m('post-session', 'gentle', 'coach', 'That counted. All of it. Even the parts that felt clumsy.'),
  m('post-session', 'gentle', 'pt', 'Your joints just got a little more resilient. They will keep working on it while you rest.'),
  m('post-session', 'gentle', 'coach', 'You kept a promise to yourself today. That is who you are now.'),
  m('post-session', 'fierce', 'coach', 'That is the work. Nobody did it for you. Nobody could.'),
  m('post-session', 'fierce', 'coach', 'Session {{n}}. The old story said you would have quit by now. You are writing a different one.'),
  m('post-session', 'fierce', 'coach', 'You fought for yourself today and you won. Rest like a champion.'),
  m('post-session', 'calm', 'coach', 'Complete. Same flow next time. Nothing to carry until then.'),
  m('post-session', 'calm', 'coach', 'Logged and done. The plan takes it from here.'),
  m('post-session', 'calm', 'pt', 'Good session. Let the recovery do its part now.'),
  m('post-session', 'any', 'coach', 'You are someone who follows through. Look at the evidence.'),
  m('post-session', 'any', 'coach', 'Small, steady, repeated. That is how a tree grows, and how you do.'),
  m('post-session', 'any', 'coach', 'Notice how you feel in your body right now. That feeling is yours to keep.'),
  m('post-session', 'any', 'coach', 'Well done, good and faithful. The body you were given just got a little more able.', true),
  m('post-session', 'any', 'coach', 'Strength for today, and rest to receive. Both are gifts.', true),
  m('post-session', 'any', 'coach', 'You worked, He grows. Rest now.', true),

  // ---------------- Milestones ----------------
  m('milestone', 'any', 'coach', 'Session {{n}}. That is not luck; that is a pattern. Your pattern.'),
  m('milestone', 'any', 'coach', 'A new leaf on the tree. You grew that.'),
  m('milestone', 'any', 'pt', 'Your balance numbers are moving. Quietly, steadily, in the right direction.'),
  m('milestone', 'any', 'coach', 'The weight went up. Your body asked for more and you answered.'),
  m('milestone', 'gentle', 'coach', 'Look how far you have come, gently, without forcing anything.'),
  m('milestone', 'fierce', 'coach', 'Milestone. You earned every inch of it.'),
  m('milestone', 'calm', 'coach', 'A marker on the path. Same direction, keep walking.'),
  m('milestone', 'any', 'coach', 'Faithful in small things. This is what that looks like.', true),

  // ---------------- Comeback ----------------
  m('comeback', 'any', 'coach', 'You came back. That is the skill. Everything else is details.'),
  m('comeback', 'any', 'coach', 'Welcome back. The plan is a little lighter today, on purpose. Nothing was lost.'),
  m('comeback', 'any', 'pt', 'We ease back in. Your joints remember more than you think.'),
  m('comeback', 'gentle', 'coach', 'No catching up needed. Today is just today.'),
  m('comeback', 'fierce', 'coach', 'Returning is the bravest rep there is. You just did it.'),
  m('comeback', 'calm', 'coach', 'Same structure, lighter load. Pick up where you are, not where you were.'),
  m('comeback', 'any', 'coach', 'Your tree is exactly as tall as when you left. Trees do not shrink for resting.'),
  m('comeback', 'any', 'coach', 'His mercies are new every morning. So is this session.', true),

  // ---------------- "I want to quit today" ----------------
  m('quit', 'gentle', 'coach', 'It is okay to feel this. Would three more minutes feel possible? If not, stopping is allowed and it still counts.'),
  m('quit', 'gentle', 'coach', 'You do not have to finish to have succeeded. You started. That was the hard part.'),
  m('quit', 'gentle', 'pt', 'If something hurts, stopping is the right call. If it is just hard, the short version is right here.'),
  m('quit', 'fierce', 'coach', 'This moment is the whole fight. Not the reps. This. You get to choose, and any choice you make with care is a win.'),
  m('quit', 'fierce', 'coach', 'You are not quitting on yourself by resting. You are listening. That is strength too.'),
  m('quit', 'calm', 'coach', 'Three options, all fine: a shorter version, a pause, or stop for today. Pick the one that is true.'),
  m('quit', 'any', 'coach', 'Remember why: "{{why}}"'),
  m('quit', 'any', 'coach', 'Whatever you choose, tomorrow is still there and so am I.'),
  m('quit', 'any', 'coach', 'Come to me, all who are weary. Rest is not failure.', true),

  // ---------------- Rest / not today ----------------
  m('rest', 'any', 'coach', 'Not today is a complete sentence. The plan waits for you without a single mark against you.'),
  m('rest', 'any', 'coach', 'Rest grows roots. See you next time.'),
  m('rest', 'any', 'pt', 'Recovery is when the strength is actually built. Enjoy it.'),
  m('rest', 'gentle', 'coach', 'Be kind to yourself today. That is training too.'),
  m('rest', 'calm', 'coach', 'Noted. Nothing shifts except the date.'),

  // ---------------- Sabbath ----------------
  m('sabbath', 'any', 'coach', 'A day set apart. Nothing to do here today.'),
  m('sabbath', 'any', 'coach', 'The grove is quiet. So are we.'),
  m('sabbath', 'any', 'pt', 'Rest is part of the plan, not a gap in it.'),
  m('sabbath', 'any', 'coach', 'Remember the Sabbath day, to keep it holy. Rest well.', true),
  m('sabbath', 'any', 'coach', 'He gives rest to those He loves. Receive it today.', true),
  m('sabbath', 'any', 'coach', 'Be still. That is the whole instruction for today.', true),
  m('sabbath', 'any', 'coach', 'Six days of showing up, one of being held. Both are faithful.', true),

  // ---------------- Her Why after a gap ----------------
  m('gap-why', 'any', 'coach', 'Before we start, your own words: "{{why}}"'),
  m('gap-why', 'any', 'coach', 'You wrote this for a moment like now: "{{why}}"'),

  // ---------------- Extra identity-based lines ----------------
  m('post-session', 'any', 'coach', 'Someone who does this is someone who takes care of what she has been given. That is you.'),
  m('pre-session', 'any', 'coach', 'Not motivated? Perfect. Showing up without motivation is the strongest kind.'),
  m('post-session', 'any', 'coach', 'Your future self, stepping off a curb without a thought, says thank you.'),
  m('pre-session', 'gentle', 'coach', 'We go at your pace. There is no other pace.'),
  m('mid-set', 'any', 'coach', 'Last one. Make it the best one.'),
  m('mid-set', 'any', 'pt', 'Squeeze at the top.'),
  m('mid-set', 'any', 'pt', 'Ribs down.'),
  m('milestone', 'any', 'coach', 'A stronger you is not a goal anymore. It is a fact with a date on it.'),
  m('comeback', 'gentle', 'pt', 'Gentle today. Your ankles and knee get a soft landing back into the routine.'),
  m('post-session', 'calm', 'coach', 'Tree grew. Session logged. Nothing more is needed from you.'),
  m('pre-session', 'fierce', 'coach', 'Fear of falling used to decide things. Today, you decide.'),
  m('post-session', 'fierce', 'coach', 'You do hard things now. Quietly, regularly, on purpose.'),
  m('quit', 'gentle', 'coach', 'Nothing about you is broken for wanting to stop. Let us just pick the kindest next step.'),
  m('rest', 'fierce', 'coach', 'Warriors rest. That is how they stay warriors.'),
  m('pre-session', 'calm', 'pt', 'Balance work only on flat, even ground today. Then we begin.'),

  // ---------------- Small movement matters ----------------
  m('small', 'any', 'coach', 'Ten minutes is a real workout. So is five. So is standing up and reaching for the ceiling.', false, 'small-steps'),
  m('small', 'any', 'pt', 'Small movements are how the nervous system learns it is safe. They matter more than they feel.', false, 'small-steps'),
  m('small', 'any', 'coach', 'Little and often beats big and rarely. Every single time.', false, 'small-steps'),
  m('small', 'any', 'coach', 'Two minutes of movement is not "barely anything". It is your body learning it can trust you.', false, 'small-steps'),
  m('small', 'any', 'pt', 'One set counts. One rep counts. Your joints do not keep a scoreboard; they just notice they were used.', false, 'small-steps'),
  m('small', 'any', 'coach', 'You are allowed to do the smaller version and call it a win. Because it is one.', false, 'small-steps'),
  m('small', 'any', 'coach', 'A short session done is worth more than a long one imagined.', false, 'small-steps'),
  m('small', 'any', 'coach', 'Moving a little today keeps the door open for tomorrow. That is the whole job.', false, 'small-steps'),

  // ---------------- Freestyle ("just move") ----------------
  m('freestyle', 'any', 'coach', 'No plan today? Perfect. Tap where you would like some attention and how long you have. I will handle the rest.', false, 'small-steps'),
  m('freestyle', 'any', 'coach', 'You cannot pick wrong. Every area you choose gets safe, gentle work.', false, 'perfectionism'),
  m('freestyle', 'any', 'pt', 'Choosing your own focus is listening to your body. That is a skill, not a shortcut.', false, 'identity'),
  m('freestyle', 'any', 'coach', 'Five minutes is a full choice here. So is forty-five. Neither is more valid than the other.', false, 'small-steps'),

  // ---------------- Perfectionism ----------------
  m('word', 'any', 'coach', 'Done imperfectly is done. Perfect was never on the plan.', false, 'perfectionism'),
  m('word', 'any', 'coach', 'A wobbly rep counts exactly the same as a perfect one. It is still a rep.', false, 'perfectionism'),
  m('word', 'any', 'coach', 'You cannot get this wrong. Skips, swaps and stopping early are built in on purpose.', false, 'perfectionism'),
  m('word', 'any', 'coach', 'The goal is not a perfect session. The goal is a body that trusts you.', false, 'perfectionism'),
  m('word', 'any', 'coach', 'Start messy. Tidy comes later, or never. Both are fine.', false, 'perfectionism'),
  m('word', 'any', 'coach', 'Nobody is grading this. Not even you.', false, 'perfectionism'),
  m('quit', 'any', 'coach', 'Stopping early is not failing the session. It is finishing a shorter one.', false, 'perfectionism'),
  m('post-session', 'any', 'coach', 'That was not perfect, and it was not supposed to be. It was done.', false, 'perfectionism'),

  // ---------------- Overthinking ----------------
  m('word', 'any', 'coach', 'Overthinking is fear in a lab coat. Press Start and let the plan do the thinking.', false, 'overthinking'),
  m('word', 'any', 'coach', 'You do not have to feel ready. You only have to begin.', false, 'overthinking'),
  m('word', 'any', 'coach', 'Thinking about it does not count against you. Moving for one minute counts for you.', false, 'overthinking'),
  m('word', 'any', 'coach', 'The decision is already made: the next step is on the screen. You just take it.', false, 'overthinking'),
  m('pre-session', 'any', 'coach', 'No deciding today. That part is done. Just the next thing on the screen.', false, 'overthinking'),
  m('word', 'any', 'coach', 'When the mind spins, let the body lead for ten minutes. The mind usually follows.', false, 'overthinking'),

  // ---------------- Shame ----------------
  m('word', 'any', 'coach', 'Shame says you are behind. The truth is you are here.', false, 'shame'),
  m('word', 'any', 'coach', 'Missed days are not evidence about you. They are just days.', false, 'shame'),
  m('word', 'any', 'coach', 'There is no wrong way to show up.', false, 'shame'),
  m('word', 'any', 'coach', 'Your worth was settled long before this session. Nothing here can add to it or take from it.', false, 'shame'),
  m('comeback', 'any', 'coach', 'Nothing to apologise for. Not to me, not to yourself. Welcome back.', false, 'shame'),
  m('rest', 'any', 'coach', 'Resting is not falling behind. There is no behind.', false, 'shame'),
  m('word', 'any', 'coach', 'Progress is not a straight line, and neither is a tree.', false, 'identity'),

  // ---------------- Scripture: word for today ----------------
  v('word', 'Be strong and courageous. Do not be afraid, for the Lord your God is with you wherever you go.', 'Joshua 1:9'),
  v('word', 'I can do all things through him who strengthens me.', 'Philippians 4:13'),
  v('word', 'His mercies never come to an end; they are new every morning.', 'Lamentations 3:22-23'),
  v('word', 'Come to me, all who labor and are heavy laden, and I will give you rest.', 'Matthew 11:28', 'rest'),
  v('word', 'I praise you, for I am fearfully and wonderfully made.', 'Psalm 139:14', 'identity'),
  v('word', 'Do not despise the day of small things.', 'Zechariah 4:10', 'small-steps'),
  v('word', 'My grace is sufficient for you, for my power is made perfect in weakness.', '2 Corinthians 12:9', 'perfectionism'),
  v('word', 'There is therefore now no condemnation for those who are in Christ Jesus.', 'Romans 8:1', 'shame'),
  v('word', 'Be still, and know that I am God.', 'Psalm 46:10', 'overthinking'),
  v('word', 'Cast all your anxieties on him, because he cares for you.', '1 Peter 5:7', 'overthinking'),
  v('word', 'The Lord is my strength and my shield; my heart trusts in him, and I am helped.', 'Psalm 28:7'),
  v('word', 'Let us not grow weary of doing good, for in due season we will reap, if we do not give up.', 'Galatians 6:9'),
  v('word', 'He gives power to the faint, and to him who has no might he increases strength.', 'Isaiah 40:29'),
  v('word', 'Do not be anxious about anything.', 'Philippians 4:6', 'overthinking'),
  v('word', 'Whatever you do, work heartily, as for the Lord.', 'Colossians 3:23'),
  v('word', 'God gave us a spirit not of fear but of power and love and self-control.', '2 Timothy 1:7'),
  v('word', 'My yoke is easy, and my burden is light.', 'Matthew 11:30', 'perfectionism'),
  v('word', 'He restores my soul.', 'Psalm 23:3', 'rest'),
  v('word', 'The joy of the Lord is your strength.', 'Nehemiah 8:10'),
  v('word', 'Sufficient for the day is its own trouble.', 'Matthew 6:34', 'overthinking'),
  v('word', 'Though the righteous fall seven times, they rise again.', 'Proverbs 24:16', 'shame'),
  v('word', 'A bruised reed he will not break, and a faintly burning wick he will not quench.', 'Isaiah 42:3', 'shame'),
  v('word', 'Before I formed you in the womb I knew you.', 'Jeremiah 1:5', 'identity'),
  v('word', 'You are not your own, for you were bought with a price. So glorify God in your body.', '1 Corinthians 6:19-20', 'identity'),
  v('word', 'The steadfast love of the Lord never ceases.', 'Lamentations 3:22'),
  v('word', 'He will not let your foot be moved; he who keeps you will not slumber.', 'Psalm 121:3'),
  v('word', 'Even youths shall faint and be weary, but they who wait for the Lord shall renew their strength.', 'Isaiah 40:30-31'),
  v('word', 'In quietness and in trust shall be your strength.', 'Isaiah 30:15', 'overthinking'),
  v('word', 'Do everything without grumbling or arguing, so that you may become blameless and pure.', 'Philippians 2:14-15'),
  v('word', 'For we are his workmanship, created in Christ Jesus for good works.', 'Ephesians 2:10', 'identity'),
  v('pre-session', 'I can do all things through him who strengthens me.', 'Philippians 4:13'),
  v('pre-session', 'Be strong and courageous. The Lord your God is with you.', 'Joshua 1:9'),
  v('post-session', 'Whatever you do, work heartily, as for the Lord.', 'Colossians 3:23'),
  v('post-session', 'Let us not grow weary of doing good.', 'Galatians 6:9'),
  v('small', 'Do not despise the day of small things.', 'Zechariah 4:10', 'small-steps'),
  v('quit', 'My grace is sufficient for you, for my power is made perfect in weakness.', '2 Corinthians 12:9', 'perfectionism'),
  v('quit', 'A bruised reed he will not break.', 'Isaiah 42:3', 'shame'),
  v('comeback', 'Though the righteous fall seven times, they rise again.', 'Proverbs 24:16', 'shame'),
  v('rest', 'Come to me, all who labor and are heavy laden, and I will give you rest.', 'Matthew 11:28', 'rest'),
  v('milestone', 'For we are his workmanship, created in Christ Jesus for good works.', 'Ephesians 2:10', 'identity'),
  v('freestyle', 'Do not despise the day of small things.', 'Zechariah 4:10', 'small-steps'),
];

const recent: string[] = [];

export interface PickOptions { moment: Moment; tone: CoachTone; faithTrack: boolean; speaker?: Speaker; theme?: Theme; vars?: Record<string, string | number | undefined>; }

/** Pick a message, rotating to avoid repetition. Faith lines only when the track is on. */
export function pickMessage(opts: PickOptions): Message | null {
  let pool = MESSAGES.filter((x) => x.moment === opts.moment && (x.tone === 'any' || x.tone === opts.tone) && (opts.faithTrack || !x.faith) && (!opts.speaker || x.speaker === 'any' || x.speaker === opts.speaker) && (!opts.theme || x.theme === opts.theme));
  // Drop messages that need a variable we do not have.
  pool = pool.filter((x) => !x.text.includes('{{why}}') || !!opts.vars?.why);
  if (!pool.length) return null;
  const fresh = pool.filter((x) => !recent.includes(x.id));
  const pick = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length ? fresh : pool).length)];
  recent.push(pick.id);
  if (recent.length > 40) recent.shift();
  return { ...pick, text: interpolate(pick.text, opts.vars ?? {}) };
}

/** Render a message with its scripture reference, if any. */
export function messageText(m: Message): string {
  return m.ref ? `“${m.text}” ${m.ref}` : m.text;
}

/**
 * Word for today: deterministic per date so it stays the same all day. With the
 * faith track on, scripture and gentle words alternate; off, gentle words only.
 */
export function dailyWord(dateISO: string, faithTrack: boolean): Message {
  const pool = MESSAGES.filter((x) => x.moment === 'word' && (faithTrack || !x.faith));
  const day = Math.floor(Date.parse(dateISO) / 86_400_000);
  const scripture = pool.filter((x) => x.faith);
  const plain = pool.filter((x) => !x.faith);
  if (faithTrack && scripture.length && day % 2 === 0) return scripture[Math.floor(day / 2) % scripture.length];
  return plain[Math.floor(day / 2) % plain.length];
}

export function interpolate(text: string, vars: Record<string, string | number | undefined>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

/** Content review guard (11.6): words that must never appear in coaching copy. */
export const BANNED_PHRASES = ['no excuses', 'lazy', 'fat', 'pathetic', 'you are weak', 'so weak', 'shame on you', 'should be ashamed', 'should have', 'you failed', 'lost your streak', 'no pain no gain'];
