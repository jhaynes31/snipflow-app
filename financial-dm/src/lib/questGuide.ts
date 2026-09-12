import { QUEST_CONFIG } from "~/lib/questConfig";

/**
 * The Quest Board guide for John: one source of truth, shown inside the
 * Quest Board's Guide tab and used to build the shareable tutorial page.
 * Written for John, in plain words, naming buttons exactly as they appear.
 */

export interface GuideStep {
  /** What to do, in one sentence. */
  do: string;
  /** Why, or what to expect. Optional. */
  note?: string;
}

export interface GuideSection {
  id: string;
  /** Short title. */
  title: string;
  /** Where in the app this happens. */
  where: string;
  /** One or two sentences on the point of this step. */
  intro: string;
  steps: GuideStep[];
  /** A rule of thumb worth remembering. */
  tip?: string;
}

const D = QUEST_CONFIG.siteDomain;

export const GUIDE_LOOP: Array<{ label: string; detail: string }> = [
  { label: "Profile", detail: "who you want to help" },
  { label: "Quest", detail: "one idea to test, one link word" },
  { label: "Calendar", detail: "the posts, week by week" },
  { label: "Forge", detail: "scripts and carousels, with the link built in" },
  { label: "Post", detail: "you approve, then you post it" },
  { label: "Link", detail: `${D}/word sends viewers to the quiz` },
  { label: "Leads", detail: "each one tagged with its quest" },
  { label: "Scoreboard", detail: "which quests book calls" },
];

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "profiles",
    title: "Pick who you are talking to",
    where: "Quest Board → Profiles",
    intro: "A profile is a kind of client described by their life moment and money worries, never by who they are. Every quest aims at exactly one profile, and the forge writes to that person.",
    steps: [
      { do: "Look through the ten example profiles that come built in, like New Parents, Job Changers, Single Parents, and Small Business Owners.", note: "Each one is marked \"Example: edit or delete\". Change anything, or delete the ones you will never use." },
      { do: "The Recruit profiles tab holds people who might join the team, like Career Changer and Wants Remote Work. Those describe a situation and interests, never who someone is." },
      { do: "To add your own, press ➕ New profile and fill in the name, life stage, the moments that create the need, and what keeps them up at night.", note: "Under every box there are \"Pick or type\" chips. Tap one to fill the box, or type your own words." },
      { do: "Press 🔮 Suggest pain points to get a few lines in the person's own words. Accept the ones that ring true.", note: "Nothing is added until you accept it." },
      { do: "Short on ideas? Type a hint like \"nurses on night shifts\" in the box at the top and press 🔮 Draft a profile. Or leave the hint blank for a fresh one.", note: "The draft opens in the form for you to edit. Nothing is saved until you press Save." },
      { do: "Archive a profile you are done with instead of deleting it if it has quests attached." },
    ],
    tip: "Describe situations, not people. \"Just bought a first home\" is a profile. A race, religion, or gender is not, and the board will refuse it.",
  },
  {
    id: "quest",
    title: "Start a quest",
    where: "Quest Board → Quests → ➕ New quest",
    intro: "A quest is a short campaign, usually three weeks, aimed at one profile and testing one idea. The one thing that matters at the end is booked calls.",
    steps: [
      { do: "Choose what the quest is for: booked calls with clients, or recruits for the Guild.", note: "A recruiting quest picks from the recruit profiles, sends its link to the Guild Hall, opens the Guild forge for every post, and gets its own section on the Scoreboard." },
      { do: "Give it a name and pick the profile.", note: "The name chips suggest names built from the profile, like New Parent Armor." },
      { do: "Choose the quiz offer: the Life Insurance Quiz or the Financial Health Quiz. Optionally name a loot item to highlight.", note: "The chips list the real loot for the quiz you picked." },
      { do: "Write \"What we're testing\" as one question, for example \"Do job-change hooks book calls?\"", note: "One idea per quest. If you want to test two ideas, run two quests." },
      { do: `Set the campaign link word. This becomes ${D}/word, the address you say on camera and show on screen.`, note: "Keep it short and easy to say. Lowercase letters only, no 0 or 1 (they look like o and l on screen), and it cannot match a page that already exists. The board tells you if a word is taken." },
      { do: "Pick posts per week and the start and end dates. Switch on any recurring shows you want inside this quest." },
      { do: "Leave the status on Planning while you build the calendar. Move it to Active when you start posting, and Complete when it ends." },
    ],
    tip: "Say the link out loud before you save it. If it is awkward to say, it will be awkward for viewers to type.",
  },
  {
    id: "calendar",
    title: "Fill the calendar",
    where: "Inside a quest → 📅 Calendar",
    intro: "The calendar is the list of posts, one slot per post, grouped by week. You can let the board draft a plan or add slots by hand.",
    steps: [
      { do: "Press 🔮 Draft a plan. The board suggests a post for each date: the topic, the pain point, the hook angle, and which generator fits.", note: "It follows the house mix: mostly scripts, a few carousels and cards, memes kept to a small share, and at most one multi-part series." },
      { do: "Read the suggestions, untick any you do not want, and press ✅ Accept. The slots land on the calendar as Ideas.", note: "Or press Discard and start again. Nothing is saved until you accept." },
      { do: "To add one post yourself, press ➕ Add slot and pick the date, generator, topic, pain point, and hook angle.", note: "The pain point chips come straight from the quest's profile." },
      { do: "For a story told across several posts, press ➕ Multi-part series, set 2 to 4 parts, and write one line per part. Then give slots a part number.", note: "Each part opens by naming itself, like \"Part 2 of New Parent Armor\", and ends with a tease for the next one." },
      { do: "Shows are recurring formats that live across quests, like Trap or Treasure Tuesday and Last Call. Manage them under 📺 Shows and switch them on per quest.", note: "The plan gives a show its weekday first, then fills the rest." },
    ],
    tip: "A slot is a promise to yourself, not a contract. Skip one with the Skipped status rather than leaving a gap you feel bad about.",
  },
  {
    id: "forge",
    title: "Make the content",
    where: "Slot → 🧙 Open in generator",
    intro: "Every slot has an Open in generator button. It opens the Content Forge with the quest's brief already loaded, so the forge knows who it is for, what the post is about, and what to say at the end.",
    steps: [
      { do: "Press 🧙 Open in generator on a slot. The Script forge or Carousel forge opens with a banner showing the brief.", note: `The banner's \"Say at the end\" line is your link: \"Take the free quiz at ${D}/word.\" Scripts finish with it spoken, and carousels put it in the caption.` },
      { do: "Generate as usual, then edit anything you like. The forge works exactly as it always has; the brief only fills in the blanks for you." },
      { do: "Press 🗺️ Save to quest. The slot moves from Idea to Drafted and links to the saved script or carousel.", note: "Regenerate and save again to replace the draft. Earlier drafts stay in the slot's history." },
      { do: "Made the post some other way, like a live video? Tick \"Made another way\" on the slot and it skips the forge." },
      { do: "If the banner names a series part, the forge opens with \"Part 2 of ...\" and keeps to the outline and the part before it." },
    ],
    tip: "Open the forge from the slot, not from the main menu. That is what carries the brief and the link across.",
  },
  {
    id: "approve",
    title: "Approve, post, and record it",
    where: "Slot → Status",
    intro: "Nothing ever posts by itself. A slot moves Idea → Drafted → Approved → Posted, and only you can move it to Approved.",
    steps: [
      { do: "Read the draft. If it is right, set the status to Approved." },
      { do: "If the slot shows ⚠️ Flagged words, read them first and press acknowledge. Words like \"guaranteed\" or \"risk-free\" are flagged because they promise things we cannot promise.", note: "Flags never block you, but the board will not let a slot be Approved until you have seen them." },
      { do: "Record the video or post the carousel on TikTok. Say the link out loud and show it on screen." },
      { do: "Set the status to Posted and paste the TikTok URL into \"Post link\".", note: "You can type views, likes, comments, shares, and saves into the slot at any time. That is optional, and bookings matter more." },
      { do: "Change your mind? Approved can go back to Drafted, and any slot can be Skipped." },
    ],
    tip: "Your title is exactly \"Licensed Term Life Agent\". No promises of returns, rates, or approval, in any post.",
  },
  {
    id: "links",
    title: "How the link does the tracking",
    where: `${D}/word`,
    intro: "TikTok will not make a link in a caption clickable, so the link word is how viewers find you and how the board knows which quest sent them.",
    steps: [
      { do: `When a viewer types ${D}/word, they land on the quest's quiz, and the site remembers which quest sent them for 14 days.`, note: "This is remembered on your own site only. No outside tracking pixels are used." },
      { do: "When they finish the quiz and enter their details, the lead is tagged with the quest automatically." },
      { do: "Want to compare posts against each other? Give a slot its own \"Post link\" word, like baby2. Want to compare a series? Give the series a \"Series link\" word, like armor.", note: "The forge speaks the most specific link that exists: the post's, then the series', then the quest's. What you say on camera always matches what gets the credit." },
      { do: "Links keep working after a quest ends, so an old video that still sends people keeps giving that quest the credit." },
      { do: "Every lead form also asks \"Where did you find John?\" It is optional, and the answer is kept beside the link tag." },
    ],
    tip: "One word per quest is plenty to start. Add post and series links only when you have a real question to answer.",
  },
  {
    id: "leads",
    title: "Follow the leads",
    where: "Lead Dashboard",
    intro: "The Lead Dashboard now shows which quest each lead came from and lets you record what happened next. That record is what the Scoreboard reads.",
    steps: [
      { do: "Look at the Quest column, or use the Quest filter at the top to see one quest's leads. \"Unattributed\" shows leads with no link." },
      { do: "As you work a lead, set the status: New, Contacted, Booked, Showed, Sold, or Not a fit.", note: "Every change is saved with the time. Hover the status to see the history." },
      { do: "Choosing Not a fit asks why: Not ready yet, Just curious, Already covered, Outside John's area, Price, or Other.", note: "This is how you learn whether a quest brings the right people, not just people." },
      { do: "Choosing Sold asks for the product type, Term life or Other. No dollar amounts are stored." },
      { do: "The Source column shows the link word and platform, plus what the person said when asked where they found you." },
    ],
    tip: "Book rates decide quests. Views and likes are context, not the score.",
  },
  {
    id: "wrapup",
    title: "Wrap up and learn",
    where: "Scoreboard, or Quest → ✏️ Edit quest → Retro",
    intro: "When the end date passes, close the quest and write down what you learned while it is fresh. The Scoreboard and, later, the campaign coach both read from this.",
    steps: [
      { do: "Set the quest status to Complete." },
      { do: "Fill in the Retro: what did we learn? Two or three honest sentences are enough.", note: "The chips offer starters if the page is blank. The retro feeds the campaign coach later." },
      { do: "Open the Scoreboard. Quests are ranked by bookings, then sales, with posts, link visits, quiz starts and finishes, leads, and not-a-fit reasons beside each.", note: "Below 20 leads it says \"Too early to tell\" instead of showing rates. Tick two or three quests to see them side by side." },
      { do: "When a quest's end date passes, the Scoreboard asks \"What did we learn?\" at the top. Answer it there and it saves to the quest." },
      { do: "Start the next quest with the best-performing idea, or the next question you want answered." },
    ],
    tip: "Two completed quests with real numbers beat ten half-finished ones.",
  },
];

export const GUIDE_RULES: string[] = [
  "One idea per quest. Two ideas means two quests.",
  "Bookings are the score. Views are the weather.",
  "Nothing posts automatically. You approve, you post.",
  "Profiles are life moments and money worries, never identities.",
  `The link word is the whole tracking system: ${D}/word, said out loud and shown on screen.`,
  "Memes stay a small share. Scripts carry the quest.",
  "Your title is \"Licensed Term Life Agent\". No promised rates, returns, or approvals.",
  "Lead names, emails, and answers never go to the AI. The coach only ever sees counts.",
];
