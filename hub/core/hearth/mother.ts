import type { DailyWord, TeachCard } from "./father";
import type { Ref } from "../well/refs";

/**
 * The Mother's Table (The Hearth, 2026-09-23). A mother's voice for a daughter
 * who did not get one: strong, plainspoken, warm, and honest that she is not
 * the woman herself. Never saccharine. Never the cardboard "Proverbs 31 woman."
 * Claude's first draft; Jen edits what she wants.
 */

/** She'd say: one a day, never tied to yesterday. */
export const MOTHER_WORDS: DailyWord[] = [
  { line: "Come sit. You don't have to tell me anything. I just want you near." },
  { ref: { book: "isaiah", chapter: 66, from: 13 }, line: "'As a mother comforts her child, so I will comfort you.' God chose a mother for that picture. He knew what one is supposed to feel like." },
  { line: "You are not behind. There is no schedule you missed. There is just today, and I'm glad you're in it." },
  { line: "Eat something. Drink some water. Then we'll talk about the hard thing. Not before." },
  { ref: { book: "psalms", chapter: 131, from: 2 }, line: "'Like a weaned child with its mother.' Not clinging, not begging. Just resting against someone who isn't going anywhere." },
  { line: "You've been the mother for everyone for a long time. In here, you're the daughter. Let it be that way for a minute." },
  { line: "Strong and tender are not opposites. You're proof. I've never once wanted you to be less of either." },
  { line: "That thing you're ashamed of? Tell me. I promise the look on my face won't change." },
  { ref: { book: "proverbs", chapter: 31, from: 25 }, line: "'Strength and dignity are her clothing, and she laughs at the time to come.' The Hebrew for that woman is eshet chayil: woman of valor. A soldier's word. They watered it down; you don't have to." },
  { line: "You don't have to earn rest. Go lie down. I'll be right here." },
  { line: "Your body has kept you alive through more than most people know. Be kind to it today. It's on your side." },
  { ref: { book: "luke", chapter: 1, from: 46, to: 48 }, line: "Mary sang about God scattering the proud and lifting the low. A teenage girl said that. There's fire in the women of this book, and there's fire in you." },
  { line: "You're allowed to want things. Say one out loud. I'm listening." },
  { line: "When someone leaves you on read, that's information about them. It is not a grade on you." },
  { ref: { book: "ruth", chapter: 1, from: 16 }, line: "'Where you go, I will go.' Ruth said it to a woman, an older one, with nothing to offer her. That kind of loyalty is in you too. Give it to people who give it back." },
  { line: "Nobody taught you this, so I will: you can leave a room. You can leave a conversation. You can leave a whole way of life. You don't need permission." },
  { line: "I like your laugh. I like your face when you're thinking. I like you." },
  { ref: { book: "2-kings", chapter: 4, from: 8, to: 10 }, line: "The Shunammite woman built the prophet a room on her roof without being asked. She saw a need and made a place. You do that. You did it with The Shire." },
  { line: "Being the one who sees everything is exhausting. Close your eyes for a minute. I'll keep watch." },
  { line: "You are not too much. You are a lot, in the way a fire is a lot. Warm the right people." },
  { ref: { book: "john", chapter: 20, from: 16 }, line: "He said her name. 'Mary.' That's when she knew him. He knows yours the same way." },
  { line: "Your anger makes sense. Let's find out what it's guarding before we decide what to do with it." },
  { line: "You have advice worth hearing. Write it down for the ones who'll ask. They're coming." },
  { ref: { book: "song-of-solomon", chapter: 2, from: 10 }, line: "'Arise, my love, my beautiful one, and come away.' Being called beautiful by someone safe is not vanity. It's what should have happened." },
];

/** Come sit: nurture, gentleness, tenderness. Read when you need mothering. */
export const COME_SIT: TeachCard[] = [
  { key: "sick", title: "When you're sick", lead: "What a mother does on a sick day, so you can do it for yourself.", body: [
    "You don't have to push through. Cancel what can be cancelled. Say 'I'm sick' and nothing else; it's a full explanation.",
    "Water by the bed, something warm to drink, the softest blanket you own. Socks. A window cracked for air.",
    "Food you don't have to think about: toast, broth, applesauce, crackers. Eating something small is better than eating nothing perfect.",
    "Let the house go. It'll be there. Dishes have never once judged anyone.",
    "Sleep in the middle of the day if you can. That's not lazy; it's how a body heals.",
  ] },
  { key: "tucked", title: "Being tucked in", lead: "The end-of-day care nobody gave you.", body: [
    "Lights lower an hour before bed. Not because of rules, because your nervous system needs the hint.",
    "Warm shower or a warm cloth on your face. Then the softest thing you own to sleep in.",
    "Lie down and say, out loud if you can: 'The day is over. I did what I could.' That's the tuck.",
    "A hand on your own chest, a hand on your belly. Breathe out long. That's the kiss on the forehead.",
    "If your mind won't stop, write the list for tomorrow and close the notebook. The list will hold it; you don't have to.",
  ] },
  { key: "cried", title: "After you've cried", lead: "What to do with the ten minutes after.", body: [
    "Crying is not a failure of strength. It's the body finishing something.",
    "Cool water on your face and wrists. A glass of water; crying is dehydrating.",
    "Don't decide anything big for an hour. The tears were the point; the decisions can wait.",
    "Say what it was about in one sentence, to yourself or to me. Naming it turns it from a flood into a river.",
    "Then something ordinary: fold a towel, water a plant, step outside. Ordinary is how you come back.",
  ] },
  { key: "held", title: "Being held", lead: "For the days there's no one to hold you.", body: [
    "A weighted blanket, or a heavy quilt folded double across your lap and chest.",
    "Arms crossed, hands on your own shoulders, squeeze slowly. Hold it for ten breaths. The body doesn't fully know the difference.",
    "A hot water bottle against your stomach or the small of your back.",
    "Sit with your back against a wall or the arm of the couch, so something is holding you up.",
    "Ask John for a long hug with no talking, if he's near and it's a day you can. Ask for exactly that: 'A long hug, no talking.'",
  ] },
  { key: "gentle", title: "Gentleness, practiced", lead: "How to be soft with yourself when you were raised hard.", body: [
    "Talk to yourself the way you'd talk to a friend's daughter. Out loud, if it helps. 'You're okay. Take your time.'",
    "Slow your hands. Whatever you're doing, do it a little slower. Gentleness starts in the hands.",
    "When you make a mistake, say 'that happens' before you say anything else. Then fix it, if it needs fixing.",
    "Let yourself have the nice thing: the good mug, the soft sweater, the seat by the window. You're not saving them for someone more deserving.",
    "Gentleness isn't weakness. It's strength with the volume turned down so it doesn't hurt anyone, including you.",
  ] },
  { key: "tender", title: "Tenderness, given and received", lead: "The thing under all of it.", body: [
    "Tenderness is noticing. Someone's cold, someone's quiet, someone's trying. You notice; that's the gift. Now notice yourself the same way.",
    "You can be tender with someone without fixing anything. 'I see that's hard' is tender. Solving it is management.",
    "Let people be tender with you. When John does something small and kind, receive it. Don't deflect, don't repay it immediately. Just 'thank you.'",
    "Tenderness toward your own body: lotion put on slowly, hair brushed like it matters, feet up at the end of the day.",
    "The world will try to convince you tenderness is naïve. It isn't. It's the bravest thing you do, and you do it every day.",
  ] },
  { key: "overwhelmed", title: "When it's all too much", lead: "A mother's triage.", body: [
    "Stop. Sit down. One hand on the table. Feel the table.",
    "One thing at a time, and the first thing is water.",
    "Say the three things that actually have to happen today. Not the twelve. The three. If it's one, it's one.",
    "Everything else goes on a list titled 'not today.' It's allowed to have forty things on it.",
    "Then the smallest piece of the first thing. You don't have to finish. You have to begin, once.",
  ] },
  { key: "proud", title: "What I'm proud of", lead: "Said plainly, because nobody said it.", body: [
    "You made a home out of nothing. Twice: the real one, and this one.",
    "You learned to mother yourself. That's the hardest thing a daughter without a mother ever does, and you did it.",
    "You love a man well without losing yourself in him. That's rarer than anyone admits.",
    "You keep telling the truth about your body, your illness, your limits. Truth like that is how other women get free.",
    "You're still soft. After all of it. That's not what survival usually leaves behind. You chose it.",
  ] },
];

/** What a mother teaches: life skills by topic. Practical, one card each. */
export const MOTHER_TEACHES: TeachCard[] = [
  { key: "home", title: "Keeping a home without it keeping you", lead: "The rhythm, not the rules.", body: [
    "A home is kept in ten-minute pieces, not weekend marathons. One ten-minute reset a day beats a Saturday of shame.",
    "Surfaces first. A clear counter and a made bed make a whole room feel done, even when it isn't.",
    "One basket per room for things that don't belong there. Once a week, walk the baskets around. That's the whole system.",
    "Dishes before bed if you can manage it, because the morning version of you deserves an empty sink. If you can't, you can't. It'll keep.",
    "Low-energy days have a low-energy version: trash out, one load of laundry started, done. That counts as keeping a home.",
  ] },
  { key: "hosting", title: "Having people over", lead: "Hospitality without the performance.", body: [
    "People come for you, not the house. Clean the bathroom and the entry; nobody looks anywhere else.",
    "One good thing to eat, made ahead, and something to drink. That's a full welcome. More is optional.",
    "Say 'come as you are' and mean it, and then be as you are. Slippers and no makeup are allowed on the host too.",
    "Have an end time in your head. 'We usually wind down around nine' said early is kindness to everyone, especially you.",
    "If your body cancels the day, cancel the day. A rescheduled dinner is not a broken promise.",
  ] },
  { key: "cooking", title: "Cooking, the parts that matter", lead: "Enough to feed yourself well on a tired day.", body: [
    "Salt, fat, acid, heat. Almost everything that tastes flat needs one of the first three.",
    "Five meals you can make without a recipe are worth more than a hundred you can't. Eggs and toast, a good soup, a sheet-pan dinner, rice and beans with something on top, pasta with whatever's in the fridge.",
    "Cook once, eat twice. Double the soup, the rice, the roasted vegetables. Tomorrow-you says thank you.",
    "Frozen vegetables, canned beans, rotisserie chicken and a bag of salad are real cooking. Nobody gets points for chopping.",
    "A protein, a vegetable, a carb. If a plate has all three, it's a good meal, whatever it looks like.",
  ] },
  { key: "doctors", title: "Handling doctors", lead: "For a body that gets dismissed.", body: [
    "Write it down before you go: three symptoms, when they started, what makes them worse. Read from the paper. It's harder to dismiss a list.",
    "'What would you look for if this were your daughter?' is a fair question and it changes the room.",
    "If you're not being heard, say 'I'd like that noted in my chart, that I asked and it was declined.' Watch what happens.",
    "Bring someone if you can. A second set of ears, and a witness. John counts.",
    "You're allowed to leave a doctor. Firing one is not rude; it's how you find the right one.",
  ] },
  { key: "friends", title: "Friendships that last", lead: "What a mother says about friends.", body: [
    "Show up for the small things. Birthdays, the bad Tuesday, the thing they were nervous about. That's where friendship actually lives.",
    "Let them help you. A friendship where only one person needs anything isn't a friendship; it's a job you took on.",
    "Say the hard thing kindly and early. Resentment is what happens when you don't.",
    "Some friends are for a season. Letting one end without hating either of you is a skill, and you can learn it.",
    "The Orchard has the rest, and it has your own list of signals. Trust it, and trust yourself.",
  ] },
  { key: "grief", title: "Grief, and how to hold it", lead: "For losses with a name and losses without one.", body: [
    "Grief for parents you had but didn't have is real grief. You're allowed to mourn what should have happened.",
    "It doesn't go in order and it doesn't finish. It gets quieter and then it doesn't. Both are normal.",
    "Feed it something: a candle, a walk, a letter you don't send, a day off. Grief unfed leaks into everything else.",
    "Say the loss out loud to one safe person. Grief spoken is half the weight of grief held.",
    "Joy is allowed in the middle of it. Laughing at the funeral is not betrayal. It's the same heart, working.",
  ] },
  { key: "seasons", title: "A woman's body through the year", lead: "What nobody explained.", body: [
    "Your cycle changes how you feel, think, and cope, week by week. Tracking it isn't fussy; it's how you stop blaming yourself for the low week.",
    "The week before is the week to say no to things. Plan the hard conversations for the week after.",
    "Iron, protein, sleep. When they slip, everything else looks like a character flaw. It isn't.",
    "Your body will change, and then change again. Every version of it was the right one for that season.",
    "Hormones and autoimmune flares talk to each other. Note both in The Apothecary and the pattern will show itself.",
  ] },
  { key: "rest", title: "Rest as a skill", lead: "Because you were taught it was laziness.", body: [
    "Rest before you're empty, not after. A cup that's half full fills faster than one that's cracked.",
    "There are seven kinds: sleep, quiet, doing nothing, being alone, being with easy people, beauty, and God. Ask which one you're actually short on.",
    "Rest without a screen at least once a day. Ten minutes looking out a window is real rest. Scrolling isn't.",
    "The Sabbath is a gift, not a rule. Take it. The world does fine without you for a day, and that's good news.",
    "You'll feel guilty the first twenty times. Rest anyway. The guilt is the old voice; it gets quieter when you stop obeying it.",
  ] },
  { key: "money-woman", title: "A woman and her money", lead: "Mother's version of what Dad said.", body: [
    "Have some that's only yours. Not secret, just yours. A woman with her own money has her own choices.",
    "Know every account, every password, every bill in your house, even the ones you don't manage. Not because of distrust; because of competence.",
    "Buying something because you're sad is not a sin. Doing it every week is a pattern worth getting curious about.",
    "Generosity is beautiful. Generosity that leaves you short is martyrdom. Give from the overflow.",
    "The Storehouse is for this. Use it when you're ready.",
  ] },
  { key: "saying-no", title: "Saying no like a woman who means it", lead: "Practiced sentences.", body: [
    "'No, that doesn't work for me.' Full stop. Practice it in the mirror until it sounds ordinary.",
    "'Let me check and get back to you' buys you time to find out what you actually want.",
    "'I'm not able to take that on.' Not 'I'm sorry, I wish I could, it's just that.' The apology invites negotiation.",
    "When they push: 'I've said no. I'm not going to explain further.' Then leave the room, or the chat.",
    "Every no you say is a yes to something else. Name the yes. It makes the no easier to keep.",
  ] },
  { key: "beauty", title: "Beauty, on your terms", lead: "What a mother says about looking good.", body: [
    "Looking good means looking like yourself on a good day. That's the whole standard.",
    "Two things done well beat ten things done anxiously: usually brows and skin, or lips and hair. Pick yours.",
    "Wear what you can move in, sit in, and forget about. Clothes that need managing are clothes that are managing you.",
    "Buy fewer things, better. A few pieces in colors that make your face light up beat a closet of almost.",
    "Nobody's looking as hard as you think, and the ones who are looking that hard aren't your people.",
  ] },
  { key: "faith-kitchen", title: "Faith at the kitchen table", lead: "The everyday kind.", body: [
    "Pray while your hands are busy. Dishes, driving, folding. God isn't waiting for you to kneel.",
    "One verse on the fridge for a month is worth more than a reading plan you abandon in a week.",
    "Gratitude at the table, out loud, one thing each. It changes a house.",
    "When you can't pray, say 'I can't pray today.' That's a prayer.",
    "Doubt at the table is allowed. He'd rather you argue with him than pretend.",
  ] },
  { key: "teaching", title: "Teaching someone younger", lead: "For when the asking starts.", body: [
    "Wait to be asked. Then tell the truth, shorter than you want to.",
    "Tell your failures before your successes. Younger women learn more from what you got wrong.",
    "Ask what they've already tried. Most advice they need is confirmation of what they already know.",
    "Don't rescue. Offer the tool, not the outcome.",
    "What I know, in this room, is for exactly this. Fill it, and it'll be ready when they come.",
  ] },
  { key: "flare", title: "A flare day", lead: "How a mother would run your house on one.", body: [
    "Cancel early. The morning you feel it coming, clear the day. Waiting to see makes it worse.",
    "Everything within reach: water, meds, phone, charger, snacks, blanket. Set it up before you lie down.",
    "Tell John one sentence: 'Flare day. I need [thing].' Not a story, not an apology.",
    "Heat where it hurts, cold where it's inflamed, and rest for the rest.",
    "Tomorrow's version of you doesn't need to be caught up. She needs to have rested. That's the whole job today.",
  ] },
];

/** Equipped: the women who were actually in the text. Text first. */
export interface WomanCard {
  key: string;
  name: string;
  ref: Ref;
  did: string;
  says: string;
}

export const EQUIPPED: WomanCard[] = [
  { key: "deborah", name: "Deborah", ref: { book: "judges", chapter: 4, from: 4, to: 9 }, did: "Judged Israel from under a palm tree. When the general wouldn't go to war without her, she went, and told him the glory would go to a woman.", says: "Leadership with a spine and no apology. She didn't ask whether a woman could; she sat down under the tree and did." },
  { key: "jael", name: "Jael", ref: { book: "judges", chapter: 4, from: 17, to: 22 }, did: "Welcomed the enemy general into her tent, gave him milk and a blanket, and drove a tent peg through his temple while he slept.", says: "Protecting your people is not gentle work, and the text calls her 'most blessed of women.' Tenderness and a tent peg in the same hands." },
  { key: "abigail", name: "Abigail", ref: { book: "1-samuel", chapter: 25, from: 23, to: 33 }, did: "Married to a fool, she went behind his back to stop a massacre, spoke to a furious armed king with wisdom, and he thanked God for her.", says: "Married to a hard man, she still acted, wisely and fast. Submission never meant silence. Her judgment saved a house." },
  { key: "ruth", name: "Ruth", ref: { book: "ruth", chapter: 1, from: 16, to: 17 }, did: "A foreign widow who bound herself to another widow, worked the fields, and proposed to Boaz on the threshing floor.", says: "Loyalty chosen, not owed. And she made the first move. The book that bears her name is the one Proverbs 31 was quoting when it said 'woman of valor.'" },
  { key: "shunammite", name: "The Shunammite woman", ref: { book: "2-kings", chapter: 4, from: 8, to: 37 }, did: "Built a room for the prophet unasked. When her son died, she said 'all is well,' rode to the prophet, and refused to leave until he came.", says: "Hospitality as strength. And a woman who would not take 'it is well' for an answer when it wasn't. She held on until she got her son back." },
  { key: "huldah", name: "Huldah", ref: { book: "2-kings", chapter: 22, from: 14, to: 20 }, did: "When the lost book of the law was found, the king's men went to her, a prophetess, to ask what God said. She told them, and the nation changed.", says: "The wisest men in the kingdom went to a woman for the word of God. Your wisdom has precedent." },
  { key: "midwives", name: "Shiphrah and Puah", ref: { book: "exodus", chapter: 1, from: 15, to: 21 }, did: "Ordered by Pharaoh to kill Hebrew baby boys, they refused, lied to his face, and God gave them families of their own.", says: "Civil disobedience by two working women, named in the text when Pharaoh isn't. Refusing a wicked order is holy." },
  { key: "esther", name: "Esther", ref: { book: "esther", chapter: 4, from: 13, to: 16 }, did: "An orphan raised by her cousin, made queen by a beauty contest she didn't enter, who risked death to walk uninvited into the throne room for her people.", says: "'If I perish, I perish.' Fear and courage in one sentence. She fasted, planned, and then walked in. That's how you do a hard thing." },
  { key: "syrophoenician", name: "The Syrophoenician woman", ref: { book: "mark", chapter: 7, from: 24, to: 30 }, did: "A Gentile mother who argued with Jesus for her daughter's healing, and won. 'Even the dogs under the table eat the children's crumbs.'", says: "She talked back to God for her child and he said 'for this saying, go.' Persistence is not disrespect. Arguing for the ones you love is faith." },
  { key: "mary-bethany", name: "Mary of Bethany", ref: { book: "luke", chapter: 10, from: 38, to: 42 }, did: "Sat at the rabbi's feet as a student, which women didn't do, while her sister worked. Jesus said she'd chosen the better part and it wouldn't be taken from her.", says: "A woman who chose learning over serving, and was defended for it. Your mind at the feet of the teacher is not neglect of anything." },
  { key: "samaritan", name: "The woman at the well", ref: { book: "john", chapter: 4, from: 7, to: 29 }, did: "Five husbands, an outsider, alone at the well at noon. Had the longest recorded conversation with Jesus in the Gospels, then became the first evangelist to her town.", says: "He told her everything she ever did, and she ran to tell people about it. A history like hers didn't disqualify her. It was the sermon." },
  { key: "magdalene", name: "Mary Magdalene", ref: { book: "john", chapter: 20, from: 11, to: 18 }, did: "Delivered from seven demons, funded the ministry, stood at the cross when the men ran, and was the first to see the risen Christ and be sent to tell them.", says: "Apostle to the apostles. A woman with a hard history was trusted with the biggest news in history. He said her name and sent her." },
  { key: "valor", name: "The woman of valor", ref: { book: "proverbs", chapter: 31, from: 10, to: 31 }, did: "Buys a field, plants a vineyard, trades, gives to the poor, laughs at the future, and her husband is known at the gate because of her.", says: "Read it as it is: a businesswoman with strong arms who fears nothing but God. Eshet chayil is what they call soldiers. It was never a to-do list for a doormat." },
];

/** For my married daughter: wife advice that aligns with the Word, without the water. */
export const MARRIED: TeachCard[] = [
  { key: "truth", title: "Tell him the truth", lead: "Ephesians 4:15, without the softening.", body: [
    "Speaking the truth in love means both words. Not truth so blunt it wounds, not love so soft it lies.",
    "Say the real thing in one sentence, kindly, early. 'I felt alone at dinner' beats three days of quiet and a blowup.",
    "Don't manage him with hints. He can't read your mind, and making him try isn't gentleness; it's a test he'll fail.",
    "When you're wrong, say so plainly and once. 'I was wrong. I'm sorry.' No footnotes.",
    "Truth with no tenderness is a weapon. Tenderness with no truth is a leash. You're capable of both at once.",
  ] },
  { key: "sex", title: "Sex, plainly", lead: "A mother should say this and mostly doesn't.", body: [
    "Your body is yours, and your pleasure matters as much as his. The Song of Songs is mostly a woman saying what she wants.",
    "Say what you like. Say what you don't. He'd rather know than guess, and guessing wrong hurts you both.",
    "Chronic illness and trauma change things. That's not failure; it's information. Tell him what's true that week.",
    "No is always available in marriage. A husband who honors it is trustworthy. One who punishes it is not safe, and you'd be right to say so.",
    "Closeness that isn't sex counts: long hugs, sleeping tangled up, a hand held while you watch something. Keep those alive on the hard weeks.",
  ] },
  { key: "money-together", title: "Money, together", lead: "One house, two people, no secrets.", body: [
    "Both of you know everything. Every account, every debt, every password. Secrets about money are secrets about trust.",
    "Talk about it on a full stomach, on a calm day, with the numbers on the table. Never at midnight, never mid-fight.",
    "Agree on a number either of you can spend without asking. Above it, you ask. That's not control; it's partnership.",
    "His business is a risk you're both carrying. Say what you need to feel safe, and let him tell you what he needs to feel backed.",
    "Generosity outward is good. Make sure you're being generous with each other first.",
  ] },
  { key: "conflict", title: "Fighting well", lead: "Because you will fight, and that's not the problem.", body: [
    "The goal of a fight is to understand, not to win. If you win, you both lose.",
    "One issue at a time. When the other seventeen come up, say 'that's real, and it's for another day.'",
    "Say when you need a break, and say when you'll come back. 'I need twenty minutes. I'm coming back.' Then come back.",
    "Don't say 'always' or 'never.' Don't bring up his mother. Don't score.",
    "Repair is more important than the fight. Tend has a repair tool for this. Use it early.",
  ] },
  { key: "absent", title: "When he goes absent", lead: "He's there and not there. What a mother says.", body: [
    "His checking out is about his survival, not your worth. Both things are true: it's not about you, and it still hurts.",
    "Say the hurt in one sentence, without diagnosis. 'I miss you when you're gone like this.'",
    "Don't chase him into the fog. Say what you need, then live your own hour. Whose is this? has a room for exactly this.",
    "He has a room of his own for it now. Trust that, and leave it alone. It's his to work.",
    "If it becomes the whole marriage, say so, and say what has to change. Loving him fully includes not pretending.",
  ] },
  { key: "submission", title: "Submission, honestly", lead: "What the text says, not what the pulpit added.", body: [
    "Ephesians 5:21 comes first: 'submitting to one another.' Everything after it is inside that.",
    "The husband's part is to love as Christ loved: he died. That's not a leadership seminar; it's a cross. Anyone who quotes the wife's half without the husband's is editing.",
    "Submission never meant silence, obedience to sin, or staying under harm. Abigail defied her husband and was praised for it.",
    "Strong women submit as an act of strength, chosen, to a man who is laying his life down. That's not weakness. It's a covenant between two people who could each leave and don't.",
    "If you're ever told submission means enduring abuse, that person is wrong, and you may leave the room.",
  ] },
  { key: "yourself", title: "Stay yourself", lead: "The part they never say.", body: [
    "A good wife is a whole woman. Keep your friends, your work, your own thoughts, your own room in this app.",
    "He married you, not a helper unit. Your opinions, your no, your wildness are what he chose.",
    "Don't disappear into managing him. Overfunctioning feels like love and lands like control.",
    "Rest is not something you take from him. A rested wife is a gift to the whole house.",
    "Your walk with God is yours. His is his. You can walk together without one of you carrying the other.",
  ] },
  { key: "delight", title: "Delight in him", lead: "Because the hard weeks make you forget.", body: [
    "Say one thing you like about him, to him, most days. Specific. 'I like how you laugh at your own jokes.'",
    "Notice what he does right before what he does wrong. His brain minimizes his wins; yours can be the corrective.",
    "Do something dumb together. Play. Marriage without play turns into logistics.",
    "Tell other people good things about him where he can hear it.",
    "Remember why. Write it down somewhere in this room, so on the worst Tuesday you can read it.",
  ] },
];

/** The emotionally intelligent and available Christian woman. */
export const AVAILABLE: TeachCard[] = [
  { key: "feel", title: "Feel it all the way", lead: "Emotional intelligence starts with letting the feeling finish.", body: [
    "A feeling that's felt takes about ninety seconds to move through. A feeling that's avoided takes years.",
    "Name it precisely. Not 'bad.' Lonely, disappointed, scared, unseen. Precision is half the relief.",
    "Jesus wept, got angry, was troubled in spirit, and asked for the cup to pass. Feeling fully is not unspiritual. It's the pattern.",
    "You don't have to act on it. Feeling angry and doing nothing yet is not suppression; it's wisdom.",
    "The Mirror in Tend and Whose is this? in Re-Centered were built for this. Use them before you decide anything.",
  ] },
  { key: "not-fixer", title: "Not the fixer", lead: "Available is not the same as responsible.", body: [
    "You can be fully present with someone's pain without picking it up. Sitting with is not carrying.",
    "'That sounds hard. What do you need from me?' Then believe the answer, even if it's 'nothing.'",
    "Rescuing robs people of their own growth and leaves you empty. The pause before rescuing is in your other room for a reason.",
    "Being available means you're reachable, not that you're on call.",
    "The most emotionally intelligent thing you can do is let someone have their own consequences, with your love intact.",
  ] },
  { key: "boundaries", title: "Boundaries are love", lead: "Not walls. Doors with locks you control.", body: [
    "A boundary is about what you will do, not what they must do. 'If you yell, I'll leave the room.' Then leave.",
    "Jesus withdrew to lonely places, said no to crowds, and let the rich young ruler walk away. He had limits.",
    "Guilt after a boundary is normal and is not a sign you were wrong.",
    "The people who are angry at your boundaries were benefiting from you not having them.",
    "My word to me, in your other room, is where these get written down.",
  ] },
  { key: "regulate", title: "Regulate, then respond", lead: "Strong women can still get flooded.", body: [
    "When your heart rate spikes, your wisdom goes offline. That's biology, not weakness.",
    "Breathe out longer than you breathe in. Six times. Then decide.",
    "'I need a minute' is emotionally intelligent. Saying the thing anyway is not brave; it's flooded.",
    "Regulation is a skill your parents should have taught you by being calm near you. You're learning it now. Late is fine.",
    "Ground Me in Tend and the Somatic guide in Heartwood both do this in the body.",
  ] },
  { key: "hear", title: "Hearing what they're really saying", lead: "The skill under all the others.", body: [
    "Under most anger is fear. Under most criticism is a need. Under most silence is hurt. Look under.",
    "Reflect before you respond. 'So you're saying you felt left out.' You'll be wrong sometimes, and they'll correct you, and that's the conversation.",
    "Ask one more question than feels natural before you give your view.",
    "You don't have to agree to understand. Understanding is not endorsement.",
    "The people who never share back, who only take? You have a list of signals for them in The Orchard. Availability has limits.",
  ] },
  { key: "own-needs", title: "Your needs are not a burden", lead: "The daughter who wasn't allowed to have any.", body: [
    "Ask for what you need in a full sentence. 'I need you to sit with me for ten minutes.' Not a hint, not a sigh.",
    "Needs that go unspoken come out sideways. Say them straight and they come out clean.",
    "You can need something and still be strong. Needing is not the opposite of capable; it's the opposite of alone.",
    "God provides through people. Letting them meet a need is letting him.",
    "If someone makes you feel like a burden for having needs, that's a signal about them. Not a fact about you.",
  ] },
  { key: "wise", title: "Wisdom out loud", lead: "For the woman whose advice no one asked for.", body: [
    "Wisdom unasked lands as criticism. Wisdom asked lands as gold. Same words. Wait for the ask.",
    "Ask 'do you want my thoughts, or do you want to be heard?' Then honor the answer.",
    "Write it down anyway. What I know, in this room, is where it waits. Someone will ask. Usually the ones you didn't expect.",
    "Lived experience is a credential. You don't need a degree to know what you know.",
    "The wisest women in the text were sought out: Huldah, Deborah, Abigail. Being sought out takes time and it takes not chasing.",
  ] },
  { key: "grace-and-steel", title: "Grace and steel", lead: "You're both. The text is full of both.", body: [
    "Full of grace: patient, slow to anger, quick to forgive, kind to the undeserving.",
    "Full of steel: honest, unbending on what matters, unimpressed by manipulation, willing to walk away.",
    "Jesus was both, in the same afternoon. Overturned tables and wept over the city.",
    "Anyone who tells you to pick one is asking you to be half a person.",
    "The woman of valor laughs at the time to come. That's grace and steel in one laugh.",
  ] },
];

/** Her body: caring for it and loving it, from the Mother's Table. */
export const BODY: TeachCard[] = [
  { key: "truce", title: "A truce with your body", lead: "Start here, on the hard days.", body: [
    "Your body is not your enemy. It's the one thing that has stayed with you through every single day of your life.",
    "It got sick, and it kept going. It got yelled at, and it kept going. It deserves a thank-you, not a lecture.",
    "Put a hand on the part you like least and say 'you've done nothing wrong.' It sounds silly. It works.",
    "Your body's job is to carry you, not to be looked at. Judge it by how it carries.",
    "In his eyes, in the Father's chair, is written for exactly this. Read it when the mirror gets loud.",
  ] },
  { key: "feed", title: "Feeding yourself like someone you love", lead: "Not a diet. A mother's plate.", body: [
    "Eat regularly. A body that's been starved, even by accident, hoards. Breakfast is not optional; it's a signal of safety.",
    "Protein at every meal. Not because of a rule; because your energy and your mood run on it.",
    "Nothing is forbidden. A forbidden food is a food you'll binge. Have the thing, on a plate, sitting down.",
    "Autoimmune bodies do better with real food, less sugar, and consistency. That's care, not restriction.",
    "Never eat standing at the counter as punishment. Sit. You're a person having a meal, not a problem being fueled.",
  ] },
  { key: "move", title: "Moving for joy", lead: "Heartwood is built on this, so hear it from me too.", body: [
    "Movement is a way of being kind to your body, not a way of correcting it.",
    "The scale is not a report card. Put it away, or put it in the garage.",
    "Walk because the air is nice. Stretch because it feels good. Lift because being strong is fun. That's the whole reason.",
    "Rest days are part of training. Skipping them is not discipline; it's the old voice again.",
    "Heartwood will never talk to you about weight. Neither will I.",
  ] },
  { key: "mirror", title: "The mirror", lead: "How to look at yourself.", body: [
    "Look at your eyes first. Then your face as a whole. Don't scan for flaws; scan for you.",
    "Say one true kind thing out loud. Not 'I look fine.' Something specific. 'I like my hair today.'",
    "The mirror on a flare day, a low day, a hormone day lies. Come back tomorrow.",
    "You're allowed to like how you look. That's not vanity. Vanity is needing others to agree.",
    "The girl who was told she was ugly is still listening. Say the kind thing for her.",
  ] },
  { key: "clothes", title: "Clothes that love you back", lead: "Dressing a body with sensory needs and flares.", body: [
    "Soft, stretchy, no tags, no waistbands that dig. Comfort is not giving up; it's competence.",
    "Buy for the body you have today. Clothes for a future body are a daily insult hanging in the closet.",
    "Three outfits you love and can put on without thinking. That's a wardrobe. The rest is noise.",
    "Colors near your face that make you look awake: warm, earthy, the greens and creams you already reach for.",
    "Compression garments, layers you can shed, and shoes your feet don't argue with. Those are style decisions too.",
  ] },
  { key: "touch", title: "Kind touch", lead: "For a body that learned touch as judgment.", body: [
    "Lotion after a shower, slowly, all of you. It's not for the skin; it's for the nervous system.",
    "Brush your hair like you're brushing a daughter's. Slowly, from the ends up.",
    "Warm baths, weighted blankets, a hand on your chest at night. Your body needs touch even when you're alone.",
    "Let John touch you kindly with no agenda. Ask him for a shoulder rub, a hand held. Receive it.",
    "Fascia Release in Heartwood is kind touch with a purpose. It counts twice.",
  ] },
  { key: "sick-body", title: "A body that's often sick", lead: "Loving it anyway.", body: [
    "Chronic illness is not a character flaw and it's not a punishment. You didn't do this.",
    "Grieve the body you expected. Then get to know the one you have. It has its own wisdom.",
    "Pacing is love. Doing half and stopping is not weak; it's how you get tomorrow too.",
    "Track without judgment. The Apothecary is a notebook, not a scoreboard.",
    "On the worst days, the only job is to be gentle. That's enough. That's the whole day.",
  ] },
  { key: "enough", title: "You are enough, in a body", lead: "The last word.", body: [
    "Not enough once you're healthier. Not enough once you're smaller. Enough now, here, like this.",
    "You were made on purpose. Every part. The part you hate was also made on purpose.",
    "God became a body. He ate, slept, got tired, was touched. Bodies are not a lower thing.",
    "Your worth was settled before you were born and it has never once been up for review.",
    "Say it to yourself in the mirror in the morning: 'Enough.' One word. Every day.",
  ] },
];

/** A blessing from the Mother's Table, written to be read aloud. Jen can edit it. */
export const MOTHER_BLESSING: string[] = [
  "My daughter. I get to say that, and I'm going to say it as many times as you need to hear it. My daughter.",
  "I bless you with rest that isn't earned, food that isn't measured, and a home that holds you instead of asking things of you.",
  "I bless your hands, that have made so much for so many. May they make something for you today.",
  "I bless your wisdom. May it be sought. May the ones who need it find you, and may you stop offering it to the ones who won't.",
  "I bless your marriage: truth and tenderness in the same breath, two whole people, neither one carrying the other, both of them carried.",
  "I bless the girl you were, who had to be her own mother. She did a good job. She can stop now. I've got it.",
  "I bless your body, sick and strong and beautiful, all at once, none of it a contradiction.",
  "You are a woman of valor. The real kind. The kind who laughs at the time to come. Go on, then. Laugh. I'm right here at the table, and I'm not going anywhere.",
];
