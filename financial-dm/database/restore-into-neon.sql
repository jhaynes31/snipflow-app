-- The Financial DM: one shot restore for a fresh Neon database.
-- Paste the whole file into the Neon SQL Editor and run it once.
-- Creates the five tables and re inserts the saved scripts and carousels
-- from the September 2026 export. Safe on an empty database.

CREATE TABLE IF NOT EXISTS public.leads (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    age_range text,
    dependents text,
    has_insurance text,
    biggest_concern text,
    timeline text,
    utm_source text DEFAULT ''::text,
    utm_medium text DEFAULT ''::text,
    utm_campaign text DEFAULT ''::text,
    status text DEFAULT 'New'::text,
    created_at timestamp without time zone DEFAULT now(),
    quiz_type text DEFAULT 'insurance'::text,
    coverage_amount text,
    health text,
    tobacco text,
    monthly_budget text,
    household_income text
);

CREATE SEQUENCE IF NOT EXISTS public.leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.leads_id_seq OWNED BY public.leads.id;

CREATE TABLE IF NOT EXISTS public.meme_concepts (
    id integer NOT NULL,
    fact text NOT NULL,
    category text NOT NULL,
    template text NOT NULL,
    top_text text NOT NULL,
    bottom_text text NOT NULL,
    caption text NOT NULL,
    platform text DEFAULT ''::text,
    is_used boolean DEFAULT false,
    is_favorite boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    text_boxes text
);

CREATE SEQUENCE IF NOT EXISTS public.meme_concepts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.meme_concepts_id_seq OWNED BY public.meme_concepts.id;

CREATE TABLE IF NOT EXISTS public.saved_carousels (
    id integer NOT NULL,
    title text NOT NULL,
    caption text NOT NULL,
    call_to_action text NOT NULL,
    hashtags text,
    topic text,
    tone text,
    dnd_themed boolean DEFAULT false,
    fact text,
    slides text,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.saved_carousels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.saved_carousels_id_seq OWNED BY public.saved_carousels.id;

CREATE TABLE IF NOT EXISTS public.saved_scripts (
    id integer NOT NULL,
    title text NOT NULL,
    script text NOT NULL,
    call_to_action text NOT NULL,
    hashtags text,
    topic text,
    tone text,
    dnd_themed boolean DEFAULT false,
    fact text,
    created_at timestamp without time zone DEFAULT now(),
    kind text DEFAULT 'script'::text NOT NULL,
    hook text,
    caption text,
    hook_type text,
    target_viewer text,
    payoff text
);

CREATE SEQUENCE IF NOT EXISTS public.saved_scripts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.saved_scripts_id_seq OWNED BY public.saved_scripts.id;

CREATE TABLE IF NOT EXISTS public.social_cards (
    id integer NOT NULL,
    format text NOT NULL,
    tone text,
    dnd_themed boolean DEFAULT false,
    cards text,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.social_cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.social_cards_id_seq OWNED BY public.social_cards.id;

ALTER TABLE ONLY public.leads ALTER COLUMN id SET DEFAULT nextval('public.leads_id_seq'::regclass);

ALTER TABLE ONLY public.meme_concepts ALTER COLUMN id SET DEFAULT nextval('public.meme_concepts_id_seq'::regclass);

ALTER TABLE ONLY public.saved_carousels ALTER COLUMN id SET DEFAULT nextval('public.saved_carousels_id_seq'::regclass);

ALTER TABLE ONLY public.saved_scripts ALTER COLUMN id SET DEFAULT nextval('public.saved_scripts_id_seq'::regclass);

ALTER TABLE ONLY public.social_cards ALTER COLUMN id SET DEFAULT nextval('public.social_cards_id_seq'::regclass);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_pkey') THEN
    ALTER TABLE ONLY public.leads ADD CONSTRAINT leads_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meme_concepts_pkey') THEN
    ALTER TABLE ONLY public.meme_concepts ADD CONSTRAINT meme_concepts_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saved_carousels_pkey') THEN
    ALTER TABLE ONLY public.saved_carousels ADD CONSTRAINT saved_carousels_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saved_scripts_pkey') THEN
    ALTER TABLE ONLY public.saved_scripts ADD CONSTRAINT saved_scripts_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_cards_pkey') THEN
    ALTER TABLE ONLY public.social_cards ADD CONSTRAINT social_cards_pkey PRIMARY KEY (id);
  END IF;
END $$;

INSERT INTO public.saved_carousels (id, title, caption, call_to_action, hashtags, topic, tone, dnd_themed, fact, slides, created_at) VALUES
('3', 'Stop Relying on Willpower', 'Want to know the secret to actually building wealth? It''s not about having iron discipline. It''s about removing the need for it. Swipe through to see how automation can do the heavy lifting for you.', 'Ready to build a financial plan that works with your nature, not against it? Book a free call with John to explore strategies that stick.', '#FinancialFreedom #AutomateSavings #MoneyHabits #FinancialLiteracy #WealthBuilding #PersonalFinance #SmartMoney #FinancialPlanning', 'Financial Freedom', 'Mix / Surprise Me', 'f', 'Automating savings removes willpower from the equation entirely.', '[{"kind":"cover","background":"steel-gold","elements":[{"id":"elmt4xbf711lcjk","role":"brand","text":"The Financial DM","align":"center","vpos":"top"},{"id":"elmt4xbf7127anw","role":"heading","text":"Stop Relying on Willpower","align":"center","vpos":"middle","offsetX":0.1,"offsetY":-6},{"id":"elmt4xbf713ok1w","role":"body","text":"Automating savings removes willpower from the equation entirely.","align":"center","vpos":"middle"}]},{"kind":"content","background":"steel-gold","elements":[{"id":"elmt4xbf714gbbi","role":"tag","text":"Slide 1","align":"center","vpos":"top"},{"id":"elmt4xbf715h93b","role":"heading","text":"The Willpower Problem","align":"center","vpos":"top"},{"id":"elmt4xbf7168d82","role":"body","text":"Relying on discipline alone to save money is like holding your breath underwater. Eventually, you run out of air.","align":"center","vpos":"middle"},{"id":"elmt4xbf717m6w0","role":"brand","text":"The Financial DM","align":"center","vpos":"bottom"}]},{"kind":"content","background":"steel-gold","elements":[{"id":"elmt4xbf718nu1n","role":"tag","text":"Slide 2","align":"center","vpos":"top"},{"id":"elmt4xbf719ul20","role":"heading","text":"Automation Changes Everything","align":"center","vpos":"top"},{"id":"elmt4xbf71azl3g","role":"body","text":"When savings happen automatically, there''s nothing to decide, nothing to resist. The money moves before you even see it.","align":"center","vpos":"middle"},{"id":"elmt4xbf71brn7p","role":"brand","text":"The Financial DM","align":"center","vpos":"bottom"}]},{"kind":"content","background":"steel-gold","elements":[{"id":"elmt4xbf71ctnm8","role":"tag","text":"Slide 3","align":"center","vpos":"top"},{"id":"elmt4xbf71duunz","role":"heading","text":"You Can''t Spend What''s Not There","align":"center","vpos":"top"},{"id":"elmt4xbf71e6zbj","role":"body","text":"Set up automatic transfers to savings on payday. Your checking account only ever holds what you actually plan to spend.","align":"center","vpos":"middle"},{"id":"elmt4xbf71fs366","role":"brand","text":"The Financial DM","align":"center","vpos":"bottom"}]},{"kind":"content","background":"steel-gold","elements":[{"id":"elmt4xbf71gojvx","role":"tag","text":"Slide 4","align":"center","vpos":"top"},{"id":"elmt4xbf71htwil","role":"heading","text":"The Real Magic","align":"center","vpos":"top"},{"id":"elmt4xbf71ic8mo","role":"body","text":"You stop thinking about saving. It just happens. Month after month, year after year, your wealth quietly builds itself.","align":"center","vpos":"middle"},{"id":"elmt4xbf71jmrzo","role":"brand","text":"The Financial DM","align":"center","vpos":"bottom"}]},{"kind":"content","background":"steel-gold","elements":[{"id":"elmt4xbf71kl9dr","role":"tag","text":"Slide 5","align":"center","vpos":"top"},{"id":"elmt4xbf71l0kme","role":"heading","text":"Start Small, Watch It Grow","align":"center","vpos":"top"},{"id":"elmt4xbf71mzg8e","role":"body","text":"Even 5 to 10 percent of each paycheck, automated, adds up faster than you''d think. Consistency beats perfection every time.","align":"center","vpos":"middle"},{"id":"elmt4xbf71nl7ej","role":"brand","text":"The Financial DM","align":"center","vpos":"bottom"}]},{"kind":"content","background":"steel-gold","elements":[{"id":"elmt4xbf71ozzxy","role":"tag","text":"Slide 6","align":"center","vpos":"top"},{"id":"elmt4xbf71pel5d","role":"heading","text":"Financial Freedom Isn''t About Heroics","align":"center","vpos":"top"},{"id":"elmt4xbf71qtxsk","role":"body","text":"It''s about setting up systems that work for you while you focus on living. Boring beats broke, every single day.","align":"center","vpos":"middle"},{"id":"elmt4xbf71rqi46","role":"brand","text":"The Financial DM","align":"center","vpos":"bottom"}]},{"kind":"closing","background":"steel-gold","elements":[{"id":"elmt4xbf71sogw9","role":"brand","text":"The Financial DM","align":"center","vpos":"top"},{"id":"elmt4xbf71tfppl","role":"heading","text":"Ready to level up?","align":"center","vpos":"middle"},{"id":"elmt4xbf71u8e9m","role":"body","text":"Ready to build a financial plan that works with your nature, not against it? Book a free call with John to explore strategies that stick.","align":"center","vpos":"middle"}]}]', '2026-08-22 22:04:03.027909'),
('4', 'The Principal Quest: Breaking Free from Debt', 'Your debt payoff strategy might be sabotaged without knowing it. Learn the one move that actually speeds up your escape. Swipe through to claim your freedom.', 'Ready to map your debt escape route? Book a free call with John to build your personalized payoff plan and reclaim your gold.', '#DebtFreedom #PersonalFinance #DebtPayoff #FinancialLiteracy #MoneyMastery #DebtStrategy #FinancialPlanning #BudgetingTips', 'Getting Out of Debt', 'Informative', 't', 'Extra debt payments should generally specify that they apply to principal, not future payments.', '[{"kind":"cover","background":"steel-gold","elements":[{"id":"elmtbp8qnn1lp02","role":"brand","text":"The Financial DM","align":"center","vpos":"top"},{"id":"elmtbp8qnn2qg01","role":"heading","text":"The Principal Quest: Breaking Free from Debt","align":"center","vpos":"middle"},{"id":"elmtbp8qnn3ex2d","role":"body","text":"Extra debt payments should generally specify that they apply to principal, not future payments.","align":"center","vpos":"middle"}],"themeBorder":"pillars","themeBackground":"deep-space"},{"kind":"content","background":"steel-gold","elements":[{"id":"elmtbp8qnn40ubc","role":"tag","text":"Slide 1","align":"center","vpos":"top"},{"id":"elmtbp8qnn5ydve","role":"heading","text":"The Hidden Trap in Your Debt Battle","align":"center","vpos":"top"},{"id":"elmtbp8qnn6izp5","role":"body","text":"You send extra money to your lender. But where does it really go? Without one clear instruction, it might not cut your actual debt at all.","align":"center","vpos":"middle"},{"id":"elmtbp8qnn7je76","role":"brand","text":"The Financial DM","align":"center","vpos":"bottom"}],"themeBackground":"deep-space","themeBorder":"pillars"},{"kind":"content","background":"steel-gold","elements":[{"id":"elmtbp8qnn8pu0f","role":"tag","text":"Slide 2","align":"center","vpos":"top"},{"id":"elmtbp8qnn9uk3u","role":"heading","text":"What Actually Happens Without Direction","align":"center","vpos":"top"},{"id":"elmtbp8qnnabdwq","role":"body","text":"Lenders default to applying extra payments toward your next scheduled payment. You skip a month, not reduce what you owe. The principal stays intact.","align":"center","vpos":"middle"},{"id":"elmtbp8qnnbptud","role":"brand","text":"The Financial DM","align":"center","vpos":"bottom"}],"themeBackground":"deep-space","themeBorder":"pillars"},{"kind":"content","background":"steel-gold","elements":[{"id":"elmtbp8qnncl2qd","role":"tag","text":"Slide 3","align":"center","vpos":"top"},{"id":"elmtbp8qnnds2am","role":"heading","text":"Define: Principal","align":"center","vpos":"top"},{"id":"elmtbp8qnneexab","role":"body","text":"Principal is the original amount you borrowed. It is the actual debt target. Interest is what the lender charges on top. Only principal payments actually shrink your total burden.","align":"center","vpos":"middle"},{"id":"elmtbp8qnnft3e1","role":"brand","text":"The Financial DM","align":"center","vpos":"bottom"}],"themeBackground":"deep-space","themeBorder":"pillars"},{"kind":"content","background":"steel-gold","elements":[{"id":"elmtbp8qnng3mnr","role":"tag","text":"Slide 4","align":"center","vpos":"top"},{"id":"elmtbp8qnnhdwsm","role":"heading","text":"The Winning Move: Specify Principal","align":"center","vpos":"top"},{"id":"elmtbp8qnniz4qs","role":"body","text":"When you send extra money, write or call and state clearly: apply this payment to principal only. No exceptions. This is your saving throw against debt.","align":"center","vpos":"middle"},{"id":"elmtbp8qnnjb85r","role":"brand","text":"The Financial DM","align":"center","vpos":"bottom"}],"themeBackground":"deep-space","themeBorder":"pillars"},{"kind":"content","background":"steel-gold","elements":[{"id":"elmtbp8qnnk8yv8","role":"tag","text":"Slide 5","align":"center","vpos":"top"},{"id":"elmtbp8qnnl0f9d","role":"heading","text":"Why This Matters for Your Quest","align":"center","vpos":"top"},{"id":"elmtbp8qnnm9i97","role":"body","text":"Principal payments reduce your balance faster, lower future interest charges, and shorten your total payoff timeline. Every extra dollar counts when aimed correctly.","align":"center","vpos":"middle"},{"id":"elmtbp8qnnnwtcn","role":"brand","text":"The Financial DM","align":"center","vpos":"bottom"}],"themeBackground":"deep-space","themeBorder":"pillars"},{"kind":"content","background":"steel-gold","elements":[{"id":"elmtbp8qnnoniw3","role":"tag","text":"Slide 6","align":"center","vpos":"top"},{"id":"elmtbp8qnopr6xk","role":"heading","text":"Your Action Now","align":"center","vpos":"top"},{"id":"elmtbp8qnoqy7d1","role":"body","text":"Contact your lender in writing today. Request confirmation that extra payments apply to principal. Keep that proof. This one step accelerates your freedom significantly.","align":"center","vpos":"middle"},{"id":"elmtbp8qnorf6fn","role":"brand","text":"The Financial DM","align":"center","vpos":"bottom"}],"themeBackground":"deep-space","themeBorder":"pillars"},{"kind":"closing","background":"steel-gold","elements":[{"id":"elmtbp8qnos7a1r","role":"brand","text":"The Financial DM","align":"center","vpos":"top"},{"id":"elmtbp8qnotgl89","role":"heading","text":"Ready to level up?","align":"center","vpos":"middle"},{"id":"elmtbp8qnoueg7w","role":"body","text":"Ready to map your debt escape route? Book a free call with John to build your personalized payoff plan and reclaim your gold.","align":"center","vpos":"middle"}],"themeBackground":"deep-space","themeBorder":"pillars"}]', '2026-08-27 15:52:24.551854')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.saved_scripts (id, title, script, call_to_action, hashtags, topic, tone, dnd_themed, fact, created_at, kind, hook, caption, hook_type, target_viewer, payoff) VALUES
('2', 'The Rebalancing Quest: Keep Your Portfolio on Course', 'Here is a truth every adventurer needs: rebalancing your portfolio means periodically adjusting it back to your original target allocation. Think of it this way. When you start your quest, you equip yourself with a specific mix of armor, weapons, and tools. That is your target allocation. The exact percentage split between stocks, bonds, and other investments you chose at the beginning. Over time, some investments grow faster than others. One sword becomes more powerful than planned. Your armor weighs less than intended. Your portfolio drifts out of balance. Rebalancing is the saving throw that brings you back to center. You sell some winners and buy more losers. This locks in gains and repositions you for your actual goals. Most advisors suggest rebalancing once yearly or when any position shifts more than 5 percent from target. Why does this matter? Drifting allocations lead to unintended risk. Rebalancing keeps you aligned with your true strategy and your timeline. This is not market timing. This is discipline.', 'If you are unsure about your current allocation or when you last rebalanced, book a free call with me to review your strategy and ensure you are on track for your goals.', '#Rebalancing #PortfolioManagement #InvestmentStrategy #FinancialLiteracy #WealthBuilding #AssetAllocation #LongTermInvesting #FinancialPlanning', 'Investments', 'Informative', 't', 'Rebalancing a portfolio means periodically adjusting it back to your original target allocation.', '2026-08-28 15:53:08.225067', 'script', NULL, NULL, NULL, NULL, NULL),
('3', 'Budget First, Debt Second', 'Your debt payoff plan will fail without a real monthly budget. Here''s why. Most people attack debt by cutting expenses hard, then burning out within weeks. They make a plan on paper that looks great but doesn''t match actual life. A sustainable debt payoff strategy starts with understanding what you actually spend each month, not what you wish you spent. Build a budget that reflects your real income and your real costs. That means groceries, utilities, gas, subscriptions, everything. Then, once you know what''s left over, that''s your debt payment amount. It''s honest. It''s doable. It lasts. A budget keeps your payoff plan grounded in reality instead of fantasy. When your plan matches your life, you stick with it. When you stick with it, you win. If you''re ready to build a debt payoff strategy that actually works for your situation, let''s talk about it.', 'Book a free call with me to review your budget and create a debt payoff plan you can actually sustain.', '#DebtPayoff #BudgetingTips #FinancialLiteracy #MoneyManagement #DebtFreedom #PersonalFinance #FinancialPlanning #SustainableMoney', 'Getting Out of Debt', 'Informative', 'f', 'A debt payoff plan works best when it accounts for a real, sustainable monthly budget.', '2026-08-30 16:01:18.446747', 'script', 'Your debt payoff plan will fail without a real monthly budget.', 'Your debt won''t disappear through willpower alone. It takes a real budget that matches your actual spending and income. When your payoff plan is built on honest numbers, not wishful thinking, you follow through. Learn how to build a budget that supports debt freedom, not exhaustion.', 'contrarian', '', 'A debt payoff plan works best when it accounts for a real, sustainable monthly budget.')
ON CONFLICT (id) DO NOTHING;

SELECT pg_catalog.setval('public.leads_id_seq', 2, true);

SELECT pg_catalog.setval('public.meme_concepts_id_seq', 1, true);

SELECT pg_catalog.setval('public.saved_carousels_id_seq', 4, true);

SELECT pg_catalog.setval('public.saved_scripts_id_seq', 3, true);

SELECT pg_catalog.setval('public.social_cards_id_seq', 1, false);
