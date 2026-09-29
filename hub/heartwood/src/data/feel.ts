/**
 * What each exercise is supposed to feel like, and where (2026-09-29, Jen's
 * ask). Shown on the exercise card and during the session, warm-ups and
 * cool-downs included. Three lines each: where you should feel it, what it
 * should feel like, and what it should not feel like (the stop signal).
 * Written for a body with hypermobility: "feel" means muscle working or a
 * gentle stretch, never a joint being pushed to its end.
 */
export interface Feel { where: string; like: string; not: string }

const JOINT = 'Sharp, pinching or clicking pain inside a joint. Stop and swap it.';
const NECK = 'Any strain in the neck or a headache building. Stop and rest.';

export const FEEL: Record<string, Feel> = {
  // warm-up
  'wu-march-supported': { where: 'Front of the hips and the standing leg, a little in the calves.', like: 'Gentle waking up, easy rhythm, warmth after a minute.', not: 'Wobbling hard or gripping the counter. Go slower and lean on the counter more.' },
  'wu-ankle-circles': { where: 'All the way around the ankle and into the shin and calf.', like: 'Loosening, maybe a soft click or two, gentle stretch at the edges of the circle.', not: 'Pain on the outside of the ankle. Make the circles smaller.' },
  'wu-cat-cow': { where: 'The whole spine, one segment at a time, and the belly stretching on the cow.', like: 'Slow, oiled movement; the back warming up.', not: 'Lower-back pinching on the cow. Make the arch smaller.' },
  'wu-arm-circles': { where: 'Shoulders, upper back, and the muscles between the shoulder blades.', like: 'Warmth and freedom in the shoulders, circles getting smoother.', not: 'Clicking that hurts or the shoulder feeling like it slips. Make the circles smaller.' },
  'wu-hinge-pattern': { where: 'Backs of the thighs (hamstrings) as you tip forward, glutes as you stand.', like: 'A pull down the back of the legs; the back stays flat and quiet.', not: 'Rounding or aching in the lower back. Do not go as far.' },
  'wu-glute-bridge': { where: 'Glutes first, hamstrings a little; the front of the hips opening.', like: 'Squeezing at the top, like the glutes are lifting you.', not: 'Lower back doing the lifting or cramping hamstrings. Lower the hips a little.' },
  'wu-calf-raise-supported': { where: 'Calves, and the arch of the foot.', like: 'Working and warming, a squeeze at the top.', not: 'Cramping or the ankle rolling outward. Slow down and press through the big toe.' },
  // cool-down
  'cd-figure-four': { where: 'Deep in the outer hip and glute of the crossed leg.', like: 'A slow, spreading stretch that eases as you breathe.', not: 'Pain in the knee of the crossed leg. Lean less and support the knee.' },
  'cd-hip-flexor-block': { where: 'Front of the hip and upper thigh of the back leg.', like: 'A long stretch down the front of the hip; the belly stays soft.', not: 'Pinching in the lower back. Tuck the tailbone a little and lean less.' },
  'cd-open-book': { where: 'Upper back and the front of the chest as the arm opens.', like: 'The ribs opening, a stretch across the chest.', not: 'Shoulder pain at the top or the neck straining. Do not open as far.' },
  'cd-hamstring-band': { where: 'Back of the raised thigh, behind the knee.', like: 'A gentle pull that grows with each out-breath.', not: 'Tingling down the leg or knee pain. Bend the knee a little.' },
  'cd-calf-wall': { where: 'Calf of the back leg, down toward the heel.', like: 'A steady stretch that softens with breathing.', not: 'Pain in the Achilles or the arch. Bring the back foot closer.' },
  'cd-chest-wall': { where: 'Front of the shoulder and across the chest.', like: 'An opening stretch as you turn away from the wall.', not: 'Tingling in the fingers or a pinch in the shoulder. Lower the hand or turn less.' },
  'cd-breathing': { where: 'Belly and the sides of the ribs rising and falling.', like: 'Slower with every breath; the body getting heavier into the floor.', not: 'Dizziness. Breathe normally and stay lying down.' },
  'cd-child-pose': { where: 'Lower back lengthening, hips settling toward the heels.', like: 'Resting; the back widening as you breathe into it.', not: 'Knee pain or the neck cranked. Put a pillow under the hips and rest the forehead.' },
  // strength: squat and hinge
  'sit-to-stand-elevated': { where: 'Front of the thighs and the glutes as you stand.', like: 'Legs doing the work, weight through the whole foot.', not: 'Knees caving inward or pain in the knees. Raise the seat or use your hands.' },
  'sit-to-stand': { where: 'Thighs and glutes, a little in the core.', like: 'Standing through the heels, sitting back with control.', not: 'Dropping into the chair or knee pain. Slow the way down.' },
  'goblet-squat-box': { where: 'Thighs, glutes, and the core holding the weight.', like: 'Sitting back, the legs loading, the chest staying up.', not: 'Knees caving, heels lifting, or knee pain. Sit higher and go lighter.' },
  'goblet-squat-block': { where: 'Thighs and glutes, core and upper back holding the weight.', like: 'A controlled sit toward the block and a strong stand.', not: JOINT },
  'goblet-squat-deep': { where: 'Glutes deep, thighs, inner thighs, core.', like: 'Strong at the bottom, heels heavy, chest up.', not: 'Pinching in the front of the hip or the knees. Not as deep today.' },
  'wall-sit-partial': { where: 'Front of the thighs, burning gently after a while.', like: 'Steady work; the wall carries your back.', not: 'Knee pain. Slide a little higher.' },
  'band-good-morning': { where: 'Hamstrings and glutes, the back muscles holding flat.', like: 'A pull down the back of the legs as you tip, glutes squeezing as you stand.', not: 'The lower back aching or rounding. Tip less.' },
  'db-rdl': { where: 'Hamstrings and glutes; the back stays quiet and flat.', like: 'The weight sliding down the legs, a stretch behind the thighs, glutes finishing the stand.', not: 'Lower back taking over. Stop higher and go lighter.' },
  'db-rdl-staggered': { where: 'Hamstring and glute of the front leg mostly.', like: 'One side loading, the chair keeping you steady.', not: 'Wobbling into the back or knee pain. Use the chair more.' },
  // push
  'wall-push-up': { where: 'Chest, front of the shoulders, backs of the arms.', like: 'Pushing the wall away; the body one straight line.', not: 'Wrist pain or the shoulders shrugging up. Step closer to the wall.' },
  'incline-push-up-counter': { where: 'Chest, shoulders, triceps, and the core keeping you straight.', like: 'Harder than the wall, still controlled.', not: 'Wrist or shoulder pain, or the hips sagging. Go back to the wall.' },
  'incline-push-up-chair': { where: 'Chest, shoulders, triceps, core.', like: 'A real push, elbows tucked, breathing out on the way up.', not: 'Shoulder pinching or wrist pain. Use the counter instead.' },
  'db-floor-press': { where: 'Chest and the backs of the arms.', like: 'Pressing straight up, elbows touching down softly.', not: 'Shoulder pain or the arms flaring wide. Go lighter and tuck the elbows.' },
  'db-floor-press-alternating': { where: 'Chest and triceps, the core keeping the ribs down.', like: 'One arm at a time, steady, no rocking.', not: 'The back arching or the shoulder pinching. Lighter.' },
  'db-overhead-press-seated': { where: 'Shoulders and the backs of the arms; the core holding you tall.', like: 'Pressing up in a line, ribs down.', not: NECK },
  // pull
  'band-row-seated': { where: 'Between the shoulder blades and the back of the shoulders.', like: 'Elbows drawing back, shoulder blades squeezing.', not: 'Shrugging into the neck or the lower back rounding. Sit taller.' },
  'band-row': { where: 'Upper back, between the shoulder blades.', like: 'A squeeze at the end of each pull, elbows close.', not: 'Neck strain. Loosen the band.' },
  'db-row-one-arm': { where: 'One side of the upper back and the back of the shoulder.', like: 'The elbow drawing up and back, the weight close to the body.', not: 'Twisting the torso or lower-back strain. Lean on the chair more.' },
  'band-pull-apart': { where: 'Between the shoulder blades and the backs of the shoulders.', like: 'A squeeze as the band opens, chest lifting.', not: 'Shoulders shrugging or pain in the front of the shoulder. Lighter band.' },
  'band-face-pull': { where: 'Back of the shoulders and upper back.', like: 'Elbows high and wide, hands to the ears, a squeeze at the end.', not: NECK },
  'band-wall-slide': { where: 'Between the shoulder blades and the outer shoulders.', like: 'The arms sliding up while the back stays on the wall.', not: 'Pinching at the top of the shoulder. Do not slide as high.' },
  // carry and core
  'db-farmer-carry': { where: 'Grip and forearms, shoulders holding down, core keeping you tall.', like: 'Walking tall with heavy hands, breathing steadily.', not: 'Leaning to one side or the shoulders creeping up. Lighter.' },
  'db-suitcase-carry': { where: 'The side of the core opposite the weight, and the grip.', like: 'The body fighting to stay upright, quietly.', not: 'Leaning into the weight or lower-back strain. Lighter.' },
  'dead-bug-heel-slide': { where: 'Low belly and the deep core.', like: 'The lower back stays gently pressed down while the heel slides.', not: 'The back arching off the floor. Slide less far.' },
  'dead-bug': { where: 'Deep core, the ribs staying down.', like: 'Slow, opposite arm and leg, breathing out as they lower.', not: 'The lower back lifting or the neck straining. Keep the head down and go smaller.' },
  'dead-bug-band': { where: 'Deep core, shoulders holding the band steady.', like: 'Everything working to keep the band still.', not: 'Back arching. Loosen the band or slide less.' },
  'glute-bridge-block': { where: 'Glutes and inner thighs squeezing the block.', like: 'Two squeezes at once: the glutes and the block.', not: 'Hamstrings cramping. Bring the feet closer to the hips.' },
  'glute-bridge-weighted': { where: 'Glutes, hamstrings, the core bracing under the weight.', like: 'A strong lift and a slow lower.', not: 'Lower back doing it. Lower the hips slightly and squeeze the glutes.' },
  'pallof-hold': { where: 'The side of the core and the deep belly, resisting the pull.', like: 'Standing still while the band tries to turn you.', not: 'Twisting or holding the breath. Stand closer to the anchor.' },
  'pallof-press': { where: 'Core, both sides, and the shoulders as the arms extend.', like: 'The band pulling harder as the arms straighten; you do not turn.', not: 'Shoulders shrugging. Shorter press.' },
  'bird-dog': { where: 'Glute of the lifted leg, the back of the shoulder, and the core keeping the hips level.', like: 'Long and steady, like a table that does not tip.', not: NECK },
  'bird-dog-arm-only': { where: 'Shoulder and upper back of the reaching arm; core keeping still.', like: 'Reaching long, nothing else moving.', not: 'Wrist pain. Make fists or use a chair.' },
  'side-plank-knees': { where: 'The side of the core facing the floor, and the outer hip.', like: 'The hips lifting into a straight line from knees to head.', not: 'Shoulder pain or wrist pain. Come down and try the hip lift.' },
  'side-lying-hip-lift': { where: 'Outer hip and the side of the waist.', like: 'A small lift and a squeeze.', not: 'Shoulder strain. Rest the head on the arm.' },
  'side-plank-feet': { where: 'The whole side of the body, hip to shoulder.', like: 'One straight line, breathing.', not: 'Shoulder pain. Go back to knees.' },
  'plank-knees': { where: 'Belly, front of the shoulders, glutes squeezing.', like: 'Straight from knees to head, the belly pulled in.', not: 'The lower back sagging or wrist pain. Rest and shorten the hold.' },
  'clamshell': { where: 'Outer hip and glute of the top leg.', like: 'A small squeeze as the knee opens; the hips stay stacked.', not: 'Rolling backward. Open less.' },
  'clamshell-band': { where: 'Outer hip and glute, deeper with the band.', like: 'A burn after a few reps; the feet stay together.', not: 'Hip pinching. Open less or lose the band.' },
  'hip-abduction-side-lying': { where: 'Outer hip of the top leg.', like: 'The leg lifting from the hip, toes forward, a squeeze at the top.', not: 'The lower back arching or the hip flexor taking over. Lift less high.' },
  'hip-abduction-standing': { where: 'Outer hip of the moving leg, and the standing hip holding steady.', like: 'A small controlled lift out to the side.', not: 'Leaning away. Hold the counter more.' },
  // PT
  'pt-ankle-4way': { where: 'Around the ankle and the shin, in four directions.', like: 'The band resisting, the foot moving slowly.', not: 'Sharp pain on either side of the ankle. Lighter band.' },
  'pt-calf-raise-one-hand': { where: 'Calves and the arches.', like: 'A slow rise and a slower lower.', not: 'The ankle rolling out. Press through the big toe.' },
  'pt-calf-raise-fingertips': { where: 'Calves and the arches, ankles working to stay steady.', like: 'Balance and strength together.', not: 'Wobbling hard. Use one hand.' },
  'pt-sls-two-hands': { where: 'The standing foot, ankle, and outer hip working to keep you still.', like: 'Small wobbles and the foot muscles busy.', not: 'Big wobbles or knee pain. Shorter hold.' },
  'pt-sls-one-hand': { where: 'Standing ankle, foot, and hip.', like: 'The foot doing a lot of small work.', not: 'Grabbing the counter hard. Back to two hands.' },
  'pt-sls-fingertips': { where: 'Standing ankle, foot, outer hip; the core holding.', like: 'Balancing with the lightest touch.', not: 'Losing balance. Use a hand.' },
  'pt-sls-none': { where: 'Standing foot, ankle, hip, and the whole core.', like: 'Quiet balance, the wobble getting smaller.', not: 'Any fear of falling. Stand next to the counter.' },
  'pt-tandem-stance': { where: 'Both ankles and the hips, keeping you in a line.', like: 'A narrow base, small corrections.', not: 'Big wobbles. Widen the stance slightly.' },
  'pt-weight-shifts': { where: 'The ankles and hips as the weight moves from foot to foot.', like: 'Slow, controlled, like sand shifting.', not: 'Knee pain. Smaller shifts.' },
  'pt-heel-toe-walk': { where: 'Ankles, feet, and hips working to stay in a line.', like: 'Slow, deliberate steps along the counter.', not: 'Dizziness. Stop and hold the counter.' },
  'pt-toe-yoga': { where: 'The arches and the small muscles of the feet.', like: 'Fiddly and tiring in a good way.', not: 'Cramping in the arch. Rest and shake the foot out.' },
  'pt-knee-to-wall': { where: 'Front of the ankle and the calf.', like: 'The ankle bending as the knee reaches the wall, heel down.', not: 'Pinching at the front of the ankle. Move the foot closer to the wall.' },
  'pt-tke': { where: 'The front of the thigh just above the knee.', like: 'The knee straightening against the band, a squeeze at the end.', not: 'Pain behind the kneecap. Lighter band.' },
  'pt-seated-knee-extension': { where: 'Front of the thigh, especially just above the knee.', like: 'A slow straighten, a squeeze, a slow lower.', not: 'Pain under the kneecap. Do not straighten all the way.' },
  'pt-seated-knee-extension-band': { where: 'Front of the thigh against the band.', like: 'Harder near the top; the squeeze matters.', not: 'Knee pain. Lighter band.' },
  'pt-straight-leg-raise': { where: 'Front of the thigh and the hip flexor; the core holding the back down.', like: 'The leg rising straight, the back quiet.', not: 'The back arching. Bend the other knee more.' },
  'pt-heel-slides': { where: 'Front of the thigh working, the back of the knee stretching.', like: 'Gentle bending, the heel sliding easily.', not: 'Knee pain. Slide less far.' },
  'pt-step-up-supported': { where: 'Thigh and glute of the stepping leg.', like: 'Pressing through the whole foot to stand on the step.', not: 'Pushing off the bottom foot or knee pain. Lower step.' },
  'pt-hip-hinge-chair': { where: 'Hamstrings and glutes, the back flat and quiet.', like: 'Hips back, chest forward, hands on the chair.', not: 'Lower back aching. Hinge less.' },
  'mob-thoracic-chair': { where: 'Upper back opening over the chair, the chest lifting.', like: 'An arch in the upper back, not the lower.', not: 'The lower back arching or dizziness. Smaller and slower.' },
  'mob-thread-needle': { where: 'Upper back and the back of the shoulder, twisting.', like: 'A gentle wring through the upper back.', not: 'Neck strain. Rest the head down.' },
  'mob-90-90-seated': { where: 'Deep in the outer hip of the crossed leg.', like: 'A slow stretch that deepens as you lean.', not: 'Knee pain. Lean less.' },
  'mob-shoulder-band-circles': { where: 'Shoulders and the upper back, all the way around.', like: 'The band keeping the arms wide, a full circle.', not: 'Pinching at the front of the shoulder. Widen the grip.' },
  'mob-pelvic-tilts': { where: 'Low belly and the lower back, a small rock.', like: 'Tiny, the back pressing down and lifting off.', not: 'Straining. Make it smaller.' },
  // somatic
  'som-orient': { where: 'The eyes and neck, and whatever the breath does on its own.', like: 'Slowing down; maybe a sigh or a yawn.', not: 'Nothing here should strain. If the eyes race, slow them.' },
  'som-ground-feet': { where: 'The soles of the feet, then the calves.', like: 'Pressing, then letting go; the letting go is the point.', not: 'Tensing the whole body. Press only the feet.' },
  'som-360-breath': { where: 'The sides and back of the ribs widening into the hands.', like: 'A slow fill, a longer empty; the heart rate settling.', not: 'Dizziness. Breathe normally and rest.' },
  'som-pandiculate': { where: 'Everywhere you tighten; then the slow release.', like: 'A full-body yawn, and softness afterward.', not: 'Joints pushed to their end. Reach less.' },
  'som-arch-flatten': { where: 'Lower back and pelvis, each vertebra joining in.', like: 'Small, slow, and felt from the inside.', not: 'Straining or squeezing the glutes. Smaller.' },
  'som-spinal-wave': { where: 'The spine, one segment at a time, from the head down and the tailbone up.', like: 'A slow wave; gravity doing the folding.', not: 'Neck strain looking up. Head arrives last.' },
  'som-side-reach': { where: 'The side ribs opening on the reaching side.', like: 'Space to breathe into; a slow return.', not: 'Collapsing the other side or reaching to the end. Reach up more than over.' },
  'som-hip-rock': { where: 'Hips and lower back, rocking.', like: 'Rhythmic and calming; the floor holding you.', not: 'Big drops. Small.' },
  'som-shake': { where: 'Hands, arms, then the legs; and the stillness after.', like: 'Loose, a little silly, then a buzz when you stop.', not: 'Heart rate jumping. Sit down and shake only the hands.' },
  'som-eye-neck': { where: 'The eyes first, then the neck turning to follow.', like: 'Slower than feels necessary; the neck freeing.', not: NECK },
  'som-self-hold': { where: 'The warmth and weight of your own hands on chest and belly.', like: 'Held; the breath slowing.', not: 'Pressing hard. Let the hands be heavy, not forceful.' },
  // fascia
  'fas-foot-roll': { where: 'The sole of the foot, arch and heel.', like: 'A good ache that eases as you roll.', not: 'Wincing. Lighter.' },
  'fas-calf-strip': { where: 'Calf, from the ankle up.', like: 'A slow glide with a little sink where it is thick.', not: 'Digging or pressing behind the knee. Lighter and lower.' },
  'fas-shin-glide': { where: 'The muscle beside the shinbone.', like: 'Fingers still, foot moving; a mild ache.', not: 'Pressing on the bone. Move off it.' },
  'fas-thigh-glide': { where: 'Front and outer thigh, knee to hip.', like: 'Broad, warm strokes; the leg relaxed.', not: 'Pressing on the kneecap. Start above it.' },
  'fas-hamstring-glide': { where: 'Back of the thigh, midway.', like: 'The ball finding a tender spot that softens as the knee moves.', not: 'The ball behind the knee or on the sit bone. Move it.' },
  'fas-glute-ball': { where: 'Deep in the outer hip and glute.', like: 'A tender spot that releases with breathing.', not: 'Full weight on the ball or the hip bone. Half your weight.' },
  'fas-hip-flexor-pin': { where: 'The soft crease at the front of the hip.', like: 'A gentle sink; the tissue softening on the out-breath.', not: 'Pressing on the pulse or digging. Lighter.' },
  'fas-thoracic-roll': { where: 'Upper back and chest opening over the roll.', like: 'A slow open with each breath.', not: 'The neck arching back. Support the head.' },
  'fas-pec-doorway': { where: 'The chest just below the collarbone.', like: 'A tender spot that eases as the arm moves.', not: 'Pressing on bone or shrugging. Move the ball and lean less.' },
  'fas-forearm-glide': { where: 'The meaty part of the forearm.', like: 'Thumb still, hand opening and closing; a mild ache.', not: 'Thumb pain from pressing. Lighter.' },
  'fas-suboccipital': { where: 'The soft hollows at the base of the skull.', like: 'The head heavy in the hands; tension draining.', not: 'Pressing on the spine. Stay in the hollows.' },
  'fas-jaw-release': { where: 'The jaw muscles in front of the ears, and the face.', like: 'Softening; a sigh on the way out.', not: 'Pressing on the jaw joint. Stay on the muscle.' },
  // pelvic floor
  'pel-360-breath': { where: 'Belly, back ribs, and the pelvic floor softening downward.', like: 'Down on the in-breath, floating back on the out-breath. No squeeze.', not: 'Bearing down or clenching. Just breathe.' },
  'pel-drop': { where: 'The pelvic floor letting go completely, sit bones widening.', like: 'The start of a pee, without pushing.', not: 'Pushing down or tightening the glutes. Let go only.' },
  'pel-happy-baby': { where: 'Inner thighs and the pelvic floor lengthening.', like: 'Open and heavy, the tailbone on the floor.', not: 'Pinching in the hips. Keep the feet on the floor instead.' },
  'pel-adductor-rock': { where: 'Inner thigh of the straight leg.', like: 'A rocking stretch that eases on the out-breath.', not: 'Sinking to the end of the stretch or wrist pain. Smaller rocks, or hands on a chair.' },
  'pel-childs-pose-breath': { where: 'Lower back widening, pelvic floor softening on each in-breath.', like: 'Resting and folded.', not: 'Hips forced down or the neck cranked. Pillow under the hips.' },
  'pel-hip-circles': { where: 'Hip joints and the pelvis moving freely.', like: 'Slow, round, small.', not: 'Wrist strain. Forearms on a chair.' },
  'pel-deep-squat-breath': { where: 'The pelvic floor opening, hips and inner thighs.', like: 'Hanging in a supported squat, breathing low.', not: 'Knee pain or bouncing. Sit on a block and let the hands carry more.' },
  'pel-elevator': { where: 'The pelvic floor lifting a little, then riding all the way down.', like: 'A third of your effort up; a full release down.', not: 'Squeezing hard or holding the breath. Less lift.' },
  'pel-bridge-exhale': { where: 'Pelvic floor, deep belly, and glutes together on the out-breath.', like: 'A small lift, a full release at the bottom.', not: 'Bridging high or arching. Small.' },
  'pel-sidelying-breath': { where: 'Back ribs and the pelvic floor softening.', like: 'Done; resting.', not: 'A painful hip underneath. Switch sides.' },
  // mobility
  'mob-neck-cars': { where: 'The deep neck muscles steering the head through a small half-circle.', like: 'Slow and controlled; front half only.', not: 'Rolling back, or dizziness. Smaller.' },
  'mob-shoulder-cars': { where: 'All around the shoulder, the muscles steering it.', like: 'A slow circle you own at every point.', not: 'Clicking or slipping. Make the circle smaller.' },
  'mob-thoracic-rotation': { where: 'Upper back turning, the hips staying put.', like: 'A slow wring of the ribs.', not: 'Turning from the neck. Let the head follow the chest.' },
  'mob-hip-cars': { where: 'Deep in the hip, the muscles steering the joint.', like: 'A slow circle from the hip with the torso still.', not: 'Leaning to get range. Smaller circle.' },
  'mob-90-90': { where: 'Both hips, rotating in and out.', like: 'A slow switch, sitting tall at each end.', not: 'Forcing the knee down. Hands take more of the weight.' },
  'mob-ankle-cars': { where: 'All around the ankle, the knee still.', like: 'A slow full circle, every point of it.', not: 'The whole leg rotating. Only the ankle.' },
};

export function feelFor(id: string): Feel | undefined {
  return FEEL[id];
}
