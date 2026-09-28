/**
 * Posable figure illustrations (2026-09-28, after Jen saw the stance
 * pictograms and rightly said they don't show the exercise). Each exercise
 * gets a pose: one or two frames of a simple side- or front-view figure with
 * the props that matter (wall, counter, chair, band, dumbbell, block, ball).
 * Two frames cross-fade so the movement reads; reduced motion shows the first
 * frame. Pure: returns SVG markup, so a script can render a contact sheet.
 */
export type Prop =
  | { kind: 'wall'; x: number }
  | { kind: 'counter'; x: number; w?: number; h?: number }
  | { kind: 'chair'; x: number; back?: 'left' | 'right' | 'none'; seatY?: number }
  | { kind: 'block'; x: number; y: number; w?: number; h?: number }
  | { kind: 'step'; x: number; w?: number; h?: number }
  | { kind: 'ball'; x: number; y: number; r?: number }
  | { kind: 'roll'; x: number; y: number }
  | { kind: 'pillow'; x: number; y: number }
  | { kind: 'band'; from: Anchor; to: Anchor | [number, number] }
  | { kind: 'dumbbell'; at: Anchor }
  | { kind: 'arrow'; from: [number, number]; to: [number, number] }
  | { kind: 'mat' };

export type Anchor = 'handF' | 'handB' | 'footF' | 'footB' | 'hands' | 'handL' | 'handR' | 'footL' | 'footR' | 'kneeF' | 'kneeB';

/** Side view. Angles in degrees from straight down; positive turns toward screen-right. */
export interface SideFrame {
  view?: 'side';
  hip: [number, number];
  torso: number;
  head?: number;
  thighF: number; shinF: number;
  thighB: number; shinB: number;
  armF: number; foreF: number;
  armB: number; foreB: number;
  props?: Prop[];
}

/** Front view. Arms and legs are left/right as the viewer sees them; angles from straight down, positive toward screen-right. */
export interface FrontFrame {
  view: 'front';
  hip: [number, number];
  lean?: number;
  armL: number; foreL: number;
  armR: number; foreR: number;
  legL: number; shinL: number;
  legR: number; shinR: number;
  props?: Prop[];
}

export type Frame = SideFrame | FrontFrame;

export interface Pose {
  a: Frame;
  b?: Frame;
  /** Props drawn under both frames. */
  props?: Prop[];
}

const L = { torso: 62, neck: 8, head: 13, thigh: 54, shin: 52, foot: 14, upper: 38, fore: 36, shoulderDrop: 6 };
const INK = '#2F4A2E';
const INK_SOFT = '#5B7B3A';
const PROP = '#8A9A6B';
const PROP_DARK = '#6B4F3A';
const BAND = '#B5563A';
const GROUND_Y = 204;

const rad = (d: number) => (d * Math.PI) / 180;
const end = (x: number, y: number, deg: number, len: number): [number, number] => [x + len * Math.sin(rad(deg)), y + len * Math.cos(rad(deg))];
const seg = (a: [number, number], b: [number, number], w: number, color: string) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;

interface Joints { hip: [number, number]; shoulder: [number, number]; head: [number, number]; handF: [number, number]; handB: [number, number]; footF: [number, number]; footB: [number, number]; kneeF: [number, number]; kneeB: [number, number] }

function sideJoints(f: SideFrame): Joints {
  const shoulder = end(f.hip[0], f.hip[1], f.torso, L.torso);
  const neckEnd = end(shoulder[0], shoulder[1], f.torso + (f.head ?? 0), L.neck);
  const head = end(neckEnd[0], neckEnd[1], f.torso + (f.head ?? 0), L.head);
  const kneeF = end(f.hip[0], f.hip[1], f.thighF, L.thigh);
  const footF = end(kneeF[0], kneeF[1], f.shinF, L.shin);
  const kneeB = end(f.hip[0], f.hip[1], f.thighB, L.thigh);
  const footB = end(kneeB[0], kneeB[1], f.shinB, L.shin);
  const sh = end(shoulder[0], shoulder[1], f.torso, -L.shoulderDrop);
  const elbowF = end(sh[0], sh[1], f.armF, L.upper);
  const handF = end(elbowF[0], elbowF[1], f.foreF, L.fore);
  const elbowB = end(sh[0], sh[1], f.armB, L.upper);
  const handB = end(elbowB[0], elbowB[1], f.foreB, L.fore);
  return { hip: f.hip, shoulder: sh, head, handF, handB, footF, footB, kneeF, kneeB };
}

function drawSide(f: SideFrame): { svg: string; joints: Joints } {
  const j = sideJoints(f);
  const sh = j.shoulder;
  const elbowF = end(sh[0], sh[1], f.armF, L.upper);
  const elbowB = end(sh[0], sh[1], f.armB, L.upper);
  const footDir = (shin: number) => shin + 90;
  const toeF = end(j.footF[0], j.footF[1], footDir(f.shinF), L.foot);
  const toeB = end(j.footB[0], j.footB[1], footDir(f.shinB), L.foot);
  const parts = [
    // back limbs first, lighter
    seg(f.hip, j.kneeB, 9, INK_SOFT), seg(j.kneeB, j.footB, 9, INK_SOFT), seg(j.footB, toeB, 7, INK_SOFT),
    seg(sh, elbowB, 8, INK_SOFT), seg(elbowB, j.handB, 8, INK_SOFT),
    // torso and head
    seg(f.hip, end(sh[0], sh[1], f.torso, 4), 11, INK),
    `<circle cx="${j.head[0].toFixed(1)}" cy="${j.head[1].toFixed(1)}" r="${L.head}" fill="${INK}"/>`,
    // front limbs
    seg(f.hip, j.kneeF, 10, INK), seg(j.kneeF, j.footF, 10, INK), seg(j.footF, toeF, 8, INK),
    seg(sh, elbowF, 9, INK), seg(elbowF, j.handF, 9, INK),
  ];
  return { svg: parts.join(''), joints: j };
}

function drawFront(f: FrontFrame): { svg: string; joints: Joints } {
  const lean = f.lean ?? 0;
  const shoulder = end(f.hip[0], f.hip[1], 180 + lean, L.torso);
  const head = end(shoulder[0], shoulder[1], 180 + lean, L.neck + L.head);
  const shL: [number, number] = [shoulder[0] - 16, shoulder[1] + 2];
  const shR: [number, number] = [shoulder[0] + 16, shoulder[1] + 2];
  const hipL: [number, number] = [f.hip[0] - 9, f.hip[1]];
  const hipR: [number, number] = [f.hip[0] + 9, f.hip[1]];
  const elL = end(shL[0], shL[1], f.armL, L.upper);
  const handL = end(elL[0], elL[1], f.foreL, L.fore);
  const elR = end(shR[0], shR[1], f.armR, L.upper);
  const handR = end(elR[0], elR[1], f.foreR, L.fore);
  const kneeL = end(hipL[0], hipL[1], f.legL, L.thigh);
  const footL = end(kneeL[0], kneeL[1], f.shinL, L.shin);
  const kneeR = end(hipR[0], hipR[1], f.legR, L.thigh);
  const footR = end(kneeR[0], kneeR[1], f.shinR, L.shin);
  const parts = [
    seg(hipL, kneeL, 10, INK), seg(kneeL, footL, 10, INK), seg(hipR, kneeR, 10, INK), seg(kneeR, footR, 10, INK),
    `<line x1="${footL[0] - 7}" y1="${footL[1]}" x2="${footL[0] + 7}" y2="${footL[1]}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>`,
    `<line x1="${footR[0] - 7}" y1="${footR[1]}" x2="${footR[0] + 7}" y2="${footR[1]}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>`,
    seg(hipL, hipR, 12, INK), seg(f.hip, shoulder, 12, INK), seg(shL, shR, 11, INK),
    `<circle cx="${head[0].toFixed(1)}" cy="${head[1].toFixed(1)}" r="${L.head}" fill="${INK}"/>`,
    seg(shL, elL, 9, INK), seg(elL, handL, 9, INK), seg(shR, elR, 9, INK), seg(elR, handR, 9, INK),
  ];
  const j: Joints = { hip: f.hip, shoulder, head, handF: handR, handB: handL, footF: footR, footB: footL, kneeF: kneeR, kneeB: kneeL };
  return { svg: parts.join(''), joints: { ...j } };
}

function anchorPoint(a: Anchor | [number, number], j: Joints): [number, number] {
  if (Array.isArray(a)) return a;
  switch (a) {
    case 'handF': case 'handR': return j.handF;
    case 'handB': case 'handL': return j.handB;
    case 'footF': case 'footR': return j.footF;
    case 'footB': case 'footL': return j.footB;
    case 'hands': return [(j.handF[0] + j.handB[0]) / 2, (j.handF[1] + j.handB[1]) / 2];
    case 'kneeF': return j.kneeF;
    case 'kneeB': return j.kneeB;
  }
}

function drawProp(p: Prop, j: Joints | null): string {
  switch (p.kind) {
    case 'wall': return `<rect x="${p.x}" y="20" width="14" height="${GROUND_Y - 20}" rx="3" fill="${PROP}" opacity="0.7"/>`;
    case 'counter': return `<rect x="${p.x}" y="${GROUND_Y - (p.h ?? 94)}" width="${p.w ?? 52}" height="${p.h ?? 94}" rx="6" fill="${INK_SOFT}" opacity="0.5"/>`;
    case 'chair': {
      const seatY = p.seatY ?? GROUND_Y - 60;
      const back = p.back ?? 'left';
      return `<g opacity="0.75"><rect x="${p.x}" y="${seatY}" width="48" height="8" rx="3" fill="${PROP_DARK}"/><rect x="${p.x + 4}" y="${seatY + 8}" width="6" height="${GROUND_Y - seatY - 8}" fill="${PROP_DARK}"/><rect x="${p.x + 38}" y="${seatY + 8}" width="6" height="${GROUND_Y - seatY - 8}" fill="${PROP_DARK}"/>${back === 'none' ? '' : `<rect x="${back === 'left' ? p.x : p.x + 42}" y="${seatY - 52}" width="6" height="56" rx="2" fill="${PROP_DARK}"/>`}</g>`;
    }
    case 'block': return `<rect x="${p.x}" y="${p.y}" width="${p.w ?? 24}" height="${p.h ?? 16}" rx="3" fill="${PROP}"/>`;
    case 'step': return `<rect x="${p.x}" y="${GROUND_Y - (p.h ?? 22)}" width="${p.w ?? 70}" height="${p.h ?? 22}" rx="4" fill="${PROP}" opacity="0.8"/>`;
    case 'ball': return `<circle cx="${p.x}" cy="${p.y}" r="${p.r ?? 8}" fill="${BAND}"/>`;
    case 'roll': return `<rect x="${p.x - 8}" y="${p.y - 30}" width="16" height="60" rx="8" fill="${PROP}"/>`;
    case 'pillow': return `<rect x="${p.x - 18}" y="${p.y - 6}" width="36" height="12" rx="6" fill="${PROP}"/>`;
    case 'mat': return `<rect x="30" y="${GROUND_Y - 2}" width="260" height="8" rx="4" fill="${PROP}" opacity="0.6"/>`;
    case 'arrow': return `<line x1="${p.from[0]}" y1="${p.from[1]}" x2="${p.to[0]}" y2="${p.to[1]}" stroke="${BAND}" stroke-width="3" stroke-linecap="round" marker-end="url(#ah)"/>`;
    case 'band': {
      if (!j) return '';
      const a = anchorPoint(p.from, j);
      const b = anchorPoint(p.to, j);
      return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${BAND}" stroke-width="4" stroke-linecap="round" stroke-dasharray="6 5"/>`;
    }
    case 'dumbbell': {
      if (!j) return '';
      const pts = p.at === 'hands' ? [j.handF, j.handB] : [anchorPoint(p.at, j)];
      return pts.map((h) => `<rect x="${(h[0] - 12).toFixed(1)}" y="${(h[1] - 5).toFixed(1)}" width="24" height="10" rx="3" fill="${PROP_DARK}"/>`).join('');
    }
  }
}

function frameSvg(f: Frame): string {
  const drawn = f.view === 'front' ? drawFront(f) : drawSide(f);
  const propsAfter = (f.props ?? []).map((p) => drawProp(p, drawn.joints)).join('');
  return drawn.svg + propsAfter;
}

/** The whole picture, 320 by 240. */
export function poseSvg(pose: Pose, label: string): string {
  const under = (pose.props ?? []).map((p) => drawProp(p, null)).join('');
  const a = frameSvg(pose.a);
  const b = pose.b ? frameSvg(pose.b) : null;
  const style = b
    ? `<style>@media (prefers-reduced-motion: no-preference){.fa{animation:fa 3.2s ease-in-out infinite}.fb{animation:fb 3.2s ease-in-out infinite}@keyframes fa{0%,40%{opacity:1}55%,85%{opacity:0}100%{opacity:1}}@keyframes fb{0%,40%{opacity:0}55%,85%{opacity:1}100%{opacity:0}}}@media (prefers-reduced-motion: reduce){.fb{opacity:0.35}}</style>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" role="img" aria-label="${label.replace(/"/g, '&quot;')}">${style}<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="${BAND}"/></marker></defs><rect width="320" height="240" rx="24" fill="#E6ECD8"/><circle cx="270" cy="44" r="22" fill="#F2C94C" opacity="0.6"/><line x1="24" y1="${GROUND_Y}" x2="296" y2="${GROUND_Y}" stroke="${PROP_DARK}" stroke-width="4" stroke-linecap="round" opacity="0.5"/>${under}<g class="fa">${a}</g>${b ? `<g class="fb">${b}</g>` : ''}</svg>`;
}

// ---------- builders, so poses stay short ----------

const G = GROUND_Y;
/** Standing side view, feet on the ground; hip height comes from the leg angles. */
export function stand(o: Partial<SideFrame> & { x?: number }): SideFrame {
  const x = o.x ?? 150;
  const thighF = o.thighF ?? 0, shinF = o.shinF ?? 0;
  // hip y so the front foot lands on the ground
  const dy = L.thigh * Math.cos(rad(thighF)) + L.shin * Math.cos(rad(shinF));
  return { hip: [x, G - dy], torso: 180, thighF, shinF, thighB: o.thighB ?? 0, shinB: o.shinB ?? 0, armF: 8, foreF: 8, armB: 8, foreB: 8, ...o, view: 'side' };
}
/** Lying on the back, head to the left. */
export function supine(o: Partial<SideFrame> & { x?: number }): SideFrame {
  const x = o.x ?? 150;
  return { hip: [x, G - 12], torso: -90, head: 0, thighF: 90, shinF: 90, thighB: 90, shinB: 90, armF: -90, foreF: -90, armB: -90, foreB: -90, ...o, view: 'side' };
}
/** Sitting on a chair (seat at ground minus 60), facing right. */
export function seated(o: Partial<SideFrame> & { x?: number }): SideFrame {
  const x = o.x ?? 150;
  return { hip: [x, G - 62], torso: 180, thighF: 90, shinF: 0, thighB: 90, shinB: 0, armF: 30, foreF: 90, armB: 30, foreB: 90, ...o, view: 'side', props: [{ kind: 'chair', x: x - 40, back: 'left' }, ...(o.props ?? [])] };
}
/** Hands and knees, facing right. */
export function quadruped(o: Partial<SideFrame> & { x?: number }): SideFrame {
  const x = o.x ?? 120;
  return { hip: [x, G - 54], torso: 110, head: -20, thighF: 0, shinF: -90, thighB: 0, shinB: -90, armF: 20, foreF: 20, armB: 20, foreB: 20, ...o, view: 'side' };
}
/** Tall kneeling, facing right. */
export function kneeling(o: Partial<SideFrame> & { x?: number }): SideFrame {
  const x = o.x ?? 150;
  return { hip: [x, G - 54], torso: 180, thighF: 0, shinF: -90, thighB: 0, shinB: -90, armF: 8, foreF: 8, armB: 8, foreB: 8, ...o, view: 'side' };
}
/** Lying on the side (drawn as a low figure), head to the left. */
export function sideLying(o: Partial<SideFrame> & { x?: number }): SideFrame {
  const x = o.x ?? 150;
  return { hip: [x, G - 22], torso: -90, head: 0, thighF: 100, shinF: 60, thighB: 100, shinB: 60, armF: -60, foreF: -120, armB: -90, foreB: -90, ...o, view: 'side' };
}
/** Face down, head to the left. */
export function prone(o: Partial<SideFrame> & { x?: number }): SideFrame {
  const x = o.x ?? 150;
  return { hip: [x, G - 14], torso: -90, head: 0, thighF: 90, shinF: 90, thighB: 90, shinB: 90, armF: -40, foreF: 20, armB: -40, foreB: 20, ...o, view: 'side' };
}
/** Standing, facing the viewer. */
export function front(o: Partial<FrontFrame> & { x?: number }): FrontFrame {
  const x = o.x ?? 160;
  return { view: 'front', hip: [x, G - L.thigh - L.shin + 2], armL: -12, foreL: -12, armR: 12, foreR: 12, legL: -6, shinL: -6, legR: 6, shinR: 6, ...o };
}
