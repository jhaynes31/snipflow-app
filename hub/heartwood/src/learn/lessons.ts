import type { Lesson } from '@/domain/types';

/**
 * Micro-lessons (Section 12). `unlockedBy` is a movement pattern, an exercise
 * lessonId tag, 'first-session', or 'template:<sessionType>'.
 */
export const LESSONS: Lesson[] = [
  { id: 'welcome-body', title: 'Your body is on your side', unlockedBy: 'first-session', content: [
    'Muscles, joints and the nervous system adapt to whatever you ask of them, at any age.',
    'Every session sends a small signal: "we need to be stronger here." Your body listens over weeks, not days.',
    'Soreness a day or two later is the signal being processed. Sharp pain during a movement is a different thing, and the app will always ask you to stop for that.',
  ] },
  { id: 'glutes', title: 'What your glutes actually do', unlockedBy: 'glutes', content: [
    'Your glutes are the biggest muscle group you own. They straighten the hip every time you stand, climb, or walk uphill.',
    'They also control the knee from above: a strong side-glute stops the knee from collapsing inward when you step down.',
    'Sit-to-stands, bridges and clamshells are all glute work. When they feel easy, stairs get easier too.',
  ] },
  { id: 'knees', title: 'Why the knee is never the whole story', unlockedBy: 'knees', content: [
    'The knee is a hinge between two long levers. It mostly does what the hip above it and the ankle below it tell it to do.',
    'That is why your program strengthens the hips and ankles as much as the thigh: they steer the knee.',
    'Controlled range matters. The blocks and chairs are not there because you are fragile; they let the knee build strength through the range it can trust today.',
  ] },
  { id: 'ankles-balance', title: 'How your ankles keep you balanced', unlockedBy: 'ankles-balance', content: [
    'Balance is a conversation between your feet, your inner ear and your eyes. After sprains, the foot\'s messages get quieter, so you rely more on the eyes.',
    'Ankle strength and balance drills turn the volume back up. That is why the app has you keep support nearby and reduce it slowly.',
    'Every hold on one leg is a rep for the small stabilisers around the ankle, the ones that catch you on uneven ground.',
  ] },
  { id: 'hinge', title: 'The hinge: how to pick anything up', unlockedBy: 'hinge', content: [
    'A hinge means the hips travel back while the spine stays long. The hamstrings and glutes do the lifting, and the back just holds shape.',
    'Most back strain from lifting comes from bending at the waist instead. Your Romanian deadlifts are practice for laundry baskets and grocery bags.',
    'If you feel the backs of your legs stretch as you go down, you are hinging.',
  ] },
  { id: 'core', title: 'Core strength without crunches', unlockedBy: 'core', content: [
    'The core\'s real job is to stop movement: stop the back arching, stop the trunk twisting, stop the pelvis tipping.',
    'Dead bugs, bird dogs, side planks and Pallof holds train exactly that. Crunches mostly train bending the neck forward, which is why you never do them here.',
    'A stiff, steady trunk is what lets your arms and legs be strong.',
  ] },
  { id: 'spine-neck', title: 'Taking the load off your neck', unlockedBy: 'spine-neck', content: [
    'The neck is at the mercy of what is below it. A stiff upper back and rounded shoulders leave the neck holding the head up alone.',
    'Rows, pull-aparts and open books strengthen and mobilise the upper back so the head sits on top of the spine instead of in front of it.',
    'You will notice it in the app never asks you to look up or lift your head. That is on purpose.',
  ] },
  { id: 'breathing', title: 'Why we end with breathing', unlockedBy: 'breathing', content: [
    'A long exhale nudges the nervous system from "effort" toward "recover." Recovery is when strength is actually built.',
    'With a nervous system that runs hot, this is not a nicety. It is part of the training.',
    'Legs on a chair, hand on the belly, breathe out longer than you breathe in.',
  ] },
  { id: 'soreness-vs-pain', title: 'Soreness or pain?', unlockedBy: 'first-session', content: [
    'Soreness: dull, spread across a muscle, shows up a day or two later, eases with gentle movement. Normal and safe.',
    'Pain: sharp, stabbing or shooting, located in a joint, appears during a movement, or comes with numbness, tingling or swelling. Stop and rest, and see a professional if it persists.',
    'When you log discomfort, 1-2 usually means soreness or effort. 5 or more means the app will swap the exercise for an easier one and make a note for your PT.',
  ] },
  { id: 'rest-roots', title: 'Rest grows roots', unlockedBy: 'template:ptMobility', content: [
    'Training is the request. Rest is the answer. Muscle is built in the 48 hours after a session, not during it.',
    'Your Sabbath is not a gap in the plan; it is part of the plan. The tree adds roots on rest days for that reason.',
  ] },
  { id: 'progressive-overload', title: 'How the app decides when to go heavier', unlockedBy: 'template:strengthB', content: [
    'When every set reaches the top of its rep range with effort at 7 or less and discomfort at 2 or less, the next session gets a slightly heavier weight or a stronger band.',
    'Hard sessions (effort 9+) hold the load. A discomfort score of 5 or more makes the app swap in an easier version and note it for your PT.',
    'Knees, ankles and balance progress more slowly on purpose. Three good sessions in a row for the knee and ankles, two for balance.',
  ] },
  { id: 'balance-support', title: 'From two hands to none', unlockedBy: 'balance', content: [
    'Balance work always starts supported: two hands, then one, then fingertips, then none.',
    'You move to the next level only after two clean sessions at the current one. The last step, no hands, unlocks only after a reassessment shows both sides are ready.',
    'Wobbling is the training. Grabbing the counter is what the counter is for.',
  ] },
  { id: 'somatic-why', title: 'Why we move slowly and feel it', unlockedBy: 'template:somatic', content: [
    'A nervous system that has lived through hard things keeps a low hum of alarm going. It braces the jaw, the shoulders, the belly and the pelvic floor without asking you.',
    'Somatic movement is slow on purpose. Moving slowly enough to feel it from the inside is how the brain finds out the body is safe right now, and safety is what lets muscles stop guarding.',
    'For an AuDHD brain, feeling the body can be faint, or suddenly too much. Both are normal. Drifting away and coming back is the practice; stopping early is allowed and counts.',
  ] },
  { id: 'fascia-why', title: 'Fascia: the web under the skin', unlockedBy: 'template:fascia', content: [
    'Fascia is the web of connective tissue that wraps every muscle and links the feet to the head. When it gets stuck, one tight spot pulls on places far away.',
    'Release works by giving the tissue slow, light pressure and time. Force does the opposite: the body guards harder. With hypermobility the tissue is already lax and bruises easily, so lighter than feels effective is the rule, and joints are never leaned on.',
    'If the skin flushes or feels hot, that is a signal to stop for today. Water afterward helps the body clear what moved.',
  ] },
  { id: 'pelvic-why', title: 'The pelvic floor is usually holding, not weak', unlockedBy: 'template:pelvicFloor', content: [
    'The pelvic floor is a hammock of muscle between the sit bones. It moves with every breath: down as you breathe in, up as you breathe out. It is not only about squeezing.',
    'In bodies that have been through trauma, and in hypermobile bodies, it is usually too tight, not too weak. That is why this session starts with letting go and only later adds a gentle, one-third-effort lift.',
    'The jaw and the pelvic floor mirror each other. A soft jaw, a soft belly and a slow out-breath are the tools. Nothing here is internal and every position is an invitation.',
  ] },
  { id: 'mobility-why', title: 'Control, not range', unlockedBy: 'template:ptMobility', content: [
    'A hypermobile joint already goes further than it should. Stretching it adds range it cannot control, which is how joints slip and ache.',
    'Controlled rotations do the opposite: they teach the muscles around the joint to steer it through every degree. Circles are slow, and they shrink if a joint clicks.',
    'The mobility session covers the whole body once a week, neck to ankle, with the ankle and knee PT folded in, so nothing gets left out.',
  ] },
];

export const LESSON_MAP = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
