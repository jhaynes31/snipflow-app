import type { Ref } from "./refs";

/**
 * Today: one small thing, whenever you open it. A passage (Gospels first),
 * one plain sentence about what Jesus did or said there, and one question
 * to carry. Chosen by the day, so it stays the same all day and never
 * mentions how long it has been.
 */
export interface TodayEntry {
  ref: Ref;
  did: string;
  question: string;
}

export const TODAY: TodayEntry[] = [
  { ref: { book: "john", chapter: 4, from: 7, to: 15 }, did: "Jesus asked a woman with a bad reputation for a drink, and offered her living water before she'd fixed anything.", question: "What would it be like to come to him thirsty, without the fixing first?" },
  { ref: { book: "mark", chapter: 4, from: 35, to: 41 }, did: "Jesus slept in the boat through a storm, then calmed it with a word.", question: "Where could you rest today, even with the wind still up?" },
  { ref: { book: "luke", chapter: 15, from: 11, to: 24 }, did: "The father saw his son a long way off and ran, before the speech was finished.", question: "What speech are you rehearsing that he doesn't need to hear?" },
  { ref: { book: "matthew", chapter: 11, from: 28, to: 30 }, did: "Jesus invited the weary and burdened to come, and promised rest, not more to carry.", question: "What are you carrying today that he offered to carry?" },
  { ref: { book: "john", chapter: 8, from: 2, to: 11 }, did: "Jesus stooped and wrote in the dirt while her accusers held their stones, and then sent them all away.", question: "Whose voice is holding the stone today, and what does Jesus say to it?" },
  { ref: { book: "luke", chapter: 10, from: 38, to: 42 }, did: "Jesus told Martha, worried and distracted, that only one thing was needed, and Mary had picked it.", question: "What is the one thing today, under all the things?" },
  { ref: { book: "mark", chapter: 1, from: 35, to: 39 }, did: "Very early, Jesus went off alone to pray, and when they came to find him he left for the next town.", question: "Where is your quiet place, even for two minutes?" },
  { ref: { book: "john", chapter: 11, from: 32, to: 36 }, did: "Jesus wept at his friend's tomb, even knowing what he was about to do.", question: "What are you allowed to grieve today?" },
  { ref: { book: "luke", chapter: 7, from: 36, to: 50 }, did: "A woman wept on Jesus' feet at a dinner, and he defended her to the host who was judging her.", question: "What would it mean to be defended, not defensive, today?" },
  { ref: { book: "matthew", chapter: 6, from: 25, to: 34 }, did: "Jesus pointed at birds and flowers and said: your Father knows what you need.", question: "What is one worry you can leave with him until tomorrow?" },
  { ref: { book: "john", chapter: 13, from: 3, to: 15 }, did: "Jesus, knowing who he was, took off his robe and washed his friends' feet.", question: "Who could you serve today, quietly, with no announcement?" },
  { ref: { book: "mark", chapter: 5, from: 25, to: 34 }, did: "A woman touched his cloak in secret, and he stopped the crowd to call her 'daughter.'", question: "Where are you reaching in secret, hoping not to be noticed?" },
  { ref: { book: "luke", chapter: 5, from: 27, to: 32 }, did: "Jesus called a tax collector and then ate dinner with his friends, while the religious people complained.", question: "Who would Jesus eat with today that religion would avoid?" },
  { ref: { book: "john", chapter: 21, from: 15, to: 19 }, did: "After Peter denied him three times, Jesus asked three times 'do you love me?' and gave him his job back.", question: "What failure are you sure disqualified you?" },
  { ref: { book: "matthew", chapter: 14, from: 22, to: 33 }, did: "Peter sank, cried out, and Jesus caught him immediately, and then they talked about doubt.", question: "What does 'immediately' tell you about how he responds when you sink?" },
  { ref: { book: "luke", chapter: 8, from: 22, to: 25 }, did: "In the storm the disciples woke Jesus with 'we're going to drown,' and he got up.", question: "What would you wake him up about today?" },
  { ref: { book: "mark", chapter: 10, from: 13, to: 16 }, did: "The disciples shooed the children away; Jesus was indignant and took them in his arms.", question: "What part of you did someone once shoo away that he would pick up?" },
  { ref: { book: "john", chapter: 15, from: 1, to: 11 }, did: "Jesus said: stay in me, like a branch in a vine. Not strive. Stay.", question: "What does staying look like today, as opposed to trying harder?" },
  { ref: { book: "luke", chapter: 19, from: 1, to: 10 }, did: "Jesus looked up into a tree, called Zacchaeus by name, and invited himself over.", question: "Where are you hiding and watching, hoping he'll look up?" },
  { ref: { book: "matthew", chapter: 9, from: 9, to: 13 }, did: "Jesus said he came for the sick, not the healthy, and 'I desire mercy, not sacrifice.'", question: "Which do you offer him more often, mercy or sacrifice?" },
  { ref: { book: "john", chapter: 14, from: 1, to: 6 }, did: "Jesus told frightened friends: don't let your hearts be troubled; I'm preparing a place; I am the way.", question: "What is troubling your heart that he already knows about?" },
  { ref: { book: "luke", chapter: 22, from: 39, to: 46 }, did: "Jesus, in anguish, asked for the cup to pass, and then said 'not my will, but yours.'", question: "What honest prayer have you been afraid to pray?" },
  { ref: { book: "mark", chapter: 2, from: 1, to: 12 }, did: "Friends dug through a roof to get a paralyzed man to Jesus, and Jesus saw their faith.", question: "Who has carried you to him, and who could you carry?" },
  { ref: { book: "matthew", chapter: 5, from: 3, to: 12 }, did: "Jesus called the poor in spirit, the mourning, and the meek 'blessed,' the opposite of what everyone expected.", question: "Which of these describes you today, and what does he call it?" },
  { ref: { book: "john", chapter: 6, from: 66, to: 69 }, did: "When many left, Jesus asked the twelve if they'd leave too. Peter said: where else would we go?", question: "Where else would you go? Say it honestly." },
  { ref: { book: "luke", chapter: 12, from: 22, to: 32 }, did: "Jesus said: don't be afraid, little flock; your Father is pleased to give you the kingdom.", question: "What if he is pleased to give, not reluctant?" },
  { ref: { book: "mark", chapter: 9, from: 14, to: 27 }, did: "A father said 'I believe; help my unbelief,' and Jesus healed his son.", question: "What is your 'help my unbelief' today?" },
  { ref: { book: "matthew", chapter: 18, from: 12, to: 14 }, did: "Jesus said a shepherd leaves ninety-nine to find one, and is happier about the one.", question: "Do you believe he'd leave the ninety-nine for you?" },
  { ref: { book: "john", chapter: 10, from: 11, to: 18 }, did: "Jesus called himself the good shepherd who knows his sheep by name and lays down his life.", question: "What does it mean that he knows your name, not your file?" },
  { ref: { book: "luke", chapter: 23, from: 39, to: 43 }, did: "A dying criminal asked to be remembered, and Jesus promised 'today, with me, in paradise.'", question: "What does it tell you that this was enough?" },
  { ref: { book: "matthew", chapter: 26, from: 36, to: 41 }, did: "Jesus asked his friends to stay awake with him, and they fell asleep, and he understood.", question: "Where do you keep falling asleep, and can you hear him say 'the spirit is willing'?" },
  { ref: { book: "mark", chapter: 6, from: 30, to: 32 }, did: "Jesus told his tired disciples: come away by yourselves to a quiet place and rest.", question: "When was the last time you were told to rest, not to do more?" },
  { ref: { book: "luke", chapter: 24, from: 13, to: 32 }, did: "Two disciples walked to Emmaus with a stranger who explained everything; their hearts burned; it was him.", question: "Where might he be walking with you unrecognized?" },
  { ref: { book: "john", chapter: 1, from: 35, to: 39 }, did: "Two men followed Jesus; he turned and asked 'what do you want?' and then said 'come and see.'", question: "What do you want? Tell him plainly." },
  { ref: { book: "matthew", chapter: 8, from: 1, to: 4 }, did: "A leper said 'if you're willing,' and Jesus touched him, the untouchable, and said 'I am willing.'", question: "What have you assumed he isn't willing to touch?" },
  { ref: { book: "luke", chapter: 18, from: 9, to: 14 }, did: "The man who prayed 'God, have mercy on me, a sinner' went home right with God; the impressive one didn't.", question: "What is the shortest honest prayer you can pray today?" },
  { ref: { book: "john", chapter: 20, from: 24, to: 29 }, did: "Thomas wanted proof; Jesus came back a week later and offered his hands.", question: "What doubt would you bring him if you knew he'd come back for it?" },
  { ref: { book: "mark", chapter: 12, from: 28, to: 34 }, did: "Asked for the greatest command, Jesus said: love God with everything, and your neighbor as yourself.", question: "What would loving yourself as a neighbor look like today?" },
  { ref: { book: "matthew", chapter: 25, from: 34, to: 40 }, did: "Jesus said that feeding, welcoming, clothing, and visiting the least is done to him.", question: "Who is the least in front of you today?" },
  { ref: { book: "luke", chapter: 4, from: 16, to: 21 }, did: "Jesus read Isaiah in his hometown: good news to the poor, freedom for prisoners, sight for the blind, and said 'today.'", question: "Which of these do you need today?" },
  { ref: { book: "john", chapter: 3, from: 1, to: 17 }, did: "Jesus told a religious expert who came at night that he had to be born again, and that God loved the world.", question: "What question would you only ask at night?" },
  { ref: { book: "matthew", chapter: 7, from: 7, to: 11 }, did: "Jesus said: ask, seek, knock; your Father gives good gifts, not stones.", question: "What have you stopped asking for?" },
  { ref: { book: "luke", chapter: 13, from: 10, to: 17 }, did: "Jesus healed a woman bent double for eighteen years, on the Sabbath, and called the rule-keepers hypocrites.", question: "What has been bending you double, and what rule says you can't be healed today?" },
  { ref: { book: "john", chapter: 16, from: 31, to: 33 }, did: "Jesus said: in this world you will have trouble; take heart, I have overcome the world.", question: "What trouble is real today, and what is also true?" },
  { ref: { book: "mark", chapter: 14, from: 3, to: 9 }, did: "A woman poured expensive perfume on Jesus; others called it a waste; Jesus called it beautiful.", question: "What have you done for him that someone called a waste?" },
];
