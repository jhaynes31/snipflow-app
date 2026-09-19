import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { BodyType } from '@/db/users';

/**
 * Rotatable 3D figure (man or woman) built from primitives so it works fully
 * offline with no downloaded models. Every body part is its own mesh and is
 * tappable. Colours follow the Sunlit Forest palette: sage/stone at rest,
 * fern on hover, moss when selected. Drag to rotate, pinch or wheel to zoom.
 */

export interface PartDef { area: string; side?: 'left' | 'right'; label: string }

export interface BodyModel3DProps {
  bodyType: BodyType;
  /** Selection keys: "area" or "area:left" / "area:right". */
  selected: Set<string>;
  onTap: (part: PartDef) => void;
  autoRotate?: boolean;
  height?: number;
}

const REST = 0xdfe6cf, REST_DARK = 0x9db77a, HOVER = 0xb9cf92, SELECTED = 0x5b7b3a, SKIN_HEAD = 0xe6e1d2;

function capsule(r: number, len: number, sx = 1, sz = 1): THREE.BufferGeometry {
  const g = new THREE.CapsuleGeometry(r, len, 6, 14);
  g.scale(sx, 1, sz);
  return g;
}

interface Built { group: THREE.Group; parts: Map<THREE.Mesh, PartDef>; keyOf: (p: PartDef) => string }

function buildFigure(bodyType: BodyType, dark: boolean): Built {
  const group = new THREE.Group();
  const parts = new Map<THREE.Mesh, PartDef>();
  const w = bodyType === 'woman';
  // Proportions: shoulders wider for the man, hips wider for the woman, softer torso for the woman.
  const shoulder = w ? 0.29 : 0.35, hip = w ? 0.235 : 0.215, chestR = w ? 0.185 : 0.205, waist = w ? 0.74 : 0.88, limbR = w ? 0.07 : 0.08;
  const mat = () => new THREE.MeshStandardMaterial({ color: dark ? REST_DARK : REST, roughness: 0.75, metalness: 0.02 });
  const add = (geo: THREE.BufferGeometry, pos: [number, number, number], def: PartDef | null, rot?: [number, number, number]) => {
    const m = new THREE.Mesh(geo, def ? mat() : new THREE.MeshStandardMaterial({ color: SKIN_HEAD, roughness: 0.8 }));
    m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    m.castShadow = false;
    group.add(m);
    if (def) parts.set(m, def);
    return m;
  };
  const sideX = (side: 'left' | 'right', x: number) => (side === 'left' ? x : -x);

  // Head (not selectable) and neck.
  add(new THREE.SphereGeometry(0.16, 20, 16), [0, 1.62, 0], null);
  add(capsule(0.06, 0.08), [0, 1.40, 0], { area: 'neck', label: 'Neck' });

  // Torso: front (chest, core) and back (upper back, lower back) as separate shells.
  add(capsule(chestR, 0.22, 1.45, 0.62), [0, 1.13, 0.05], { area: 'chest', label: 'Chest' });
  add(capsule(chestR, 0.22, 1.45, 0.62), [0, 1.13, -0.06], { area: 'upper-back', label: 'Upper back' });
  add(capsule(chestR * waist, 0.16, 1.35, 0.6), [0, 0.80, 0.05], { area: 'core', label: 'Core' });
  add(capsule(chestR * waist, 0.16, 1.35, 0.6), [0, 0.80, -0.06], { area: 'lower-back', label: 'Lower back' });
  // Pelvis: hips (front) and glutes (back).
  add(capsule(hip, 0.06, 1.0, 0.5), [0, 0.56, 0.04], { area: 'hips', label: 'Hips' });
  add(capsule(hip, 0.06, 1.0, 0.58), [0, 0.54, -0.07], { area: 'glutes', label: 'Glutes' });

  for (const side of ['left', 'right'] as const) {
    const sx = sideX(side, 1);
    const lbl = side === 'left' ? 'Left' : 'Right';
    // Shoulder, upper arm, forearm, hand.
    add(new THREE.SphereGeometry(0.085, 16, 12), [sx * shoulder, 1.29, 0], { area: 'shoulders', side, label: `${lbl} shoulder` });
    add(capsule(limbR, 0.26), [sx * (shoulder + 0.06), 1.06, 0], { area: 'arms', side, label: `${lbl} arm` }, [0, 0, sx * -0.12]);
    add(capsule(limbR * 0.85, 0.24), [sx * (shoulder + 0.11), 0.76, 0.02], { area: 'forearms', side, label: `${lbl} forearm` }, [0, 0, sx * -0.1]);
    add(new THREE.SphereGeometry(0.07, 14, 10), [sx * (shoulder + 0.14), 0.58, 0.04], { area: 'forearms', side, label: `${lbl} hand & grip` });
    // Thigh split into front (quads) and back (hamstrings), knee, shin (front) and calf (back), ankle, foot.
    const lx = sx * (hip * 0.6);
    add(capsule(limbR * 1.35, 0.30, 1, 0.6), [lx, 0.28, 0.05], { area: 'quads', side, label: `${lbl} thigh (front)` });
    add(capsule(limbR * 1.35, 0.30, 1, 0.6), [lx, 0.28, -0.06], { area: 'hamstrings', side, label: `${lbl} thigh (back)` });
    add(new THREE.SphereGeometry(0.095, 16, 12), [lx, 0.02, 0], { area: 'knees', side, label: `${lbl} knee` });
    add(capsule(limbR, 0.30, 1, 0.6), [lx, -0.27, 0.04], { area: 'calves', side, label: `${lbl} shin` });
    add(capsule(limbR * 1.05, 0.28, 1, 0.65), [lx, -0.26, -0.05], { area: 'calves', side, label: `${lbl} calf` });
    add(new THREE.SphereGeometry(0.075, 14, 10), [lx, -0.52, 0], { area: 'ankles-feet', side, label: `${lbl} ankle` });
    add(capsule(0.06, 0.14, 1, 1), [lx, -0.60, 0.09], { area: 'ankles-feet', side, label: `${lbl} foot` }, [Math.PI / 2, 0, 0]);
  }
  // Hair cap: a little character, coloured bark.
  add(new THREE.SphereGeometry(0.165, 20, 12, 0, Math.PI * 2, 0, w ? 1.35 : 1.05), [0, 1.65, -0.01], null);
  group.children[group.children.length - 1].scale.set(1, 1, 1);
  (group.children[group.children.length - 1] as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: 0x6b4f3a, roughness: 0.9 });

  group.position.y = -0.5;
  const keyOf = (p: PartDef) => (p.side ? `${p.area}:${p.side}` : p.area);
  return { group, parts, keyOf };
}

export default function BodyModel3D({ bodyType, selected, onTap, autoRotate = true, height = 380 }: BodyModel3DProps) {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef<{ built: Built; renderer: THREE.WebGLRenderer; controls: OrbitControls; hovered: THREE.Mesh | null } | null>(null);
  const selRef = useRef(selected); selRef.current = selected;
  const tapRef = useRef(onTap); tapRef.current = onTap;

  // Build scene once per body type.
  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0.25, 4.6);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    scene.add(new THREE.HemisphereLight(0xfbf0cc, 0x8ba868, 0.8));
    const sun = new THREE.DirectionalLight(0xfff1c2, 1.0);
    sun.position.set(2, 4, 3);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-3, 1, -2);
    scene.add(fill);
    const built = buildFigure(bodyType, dark);
    scene.add(built.group);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 3; controls.maxDistance = 8;
    controls.autoRotate = autoRotate && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.reducedMotion !== 'true';
    controls.autoRotateSpeed = 1.2;
    controls.target.set(0, 0.05, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.setAttribute('aria-label', `Rotatable ${bodyType === 'woman' ? 'woman' : 'man'} figure. Tap a body part to select it.`);
    renderer.domElement.setAttribute('role', 'img');

    const resize = () => {
      const w = el.clientWidth || 300;
      renderer.setSize(w, height);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pick = (x: number, y: number): THREE.Mesh | null => {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects([...built.parts.keys()], false)[0];
      return (hit?.object as THREE.Mesh) ?? null;
    };
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; controls.autoRotate = false; };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 8) return;
      const m = pick(e.clientX, e.clientY);
      if (m) { const def = built.parts.get(m); if (def) tapRef.current(def); }
    };
    const onMove = (e: PointerEvent) => {
      const m = pick(e.clientX, e.clientY);
      if (state.current) state.current.hovered = m;
      renderer.domElement.style.cursor = m ? 'pointer' : 'grab';
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointermove', onMove);

    state.current = { built, renderer, controls, hovered: null };
    let raf = 0;
    const loop = () => {
      controls.update();
      // Colour parts from selection each frame (cheap: ~40 meshes).
      for (const [mesh, def] of built.parts) {
        const key = built.keyOf(def);
        const isSel = selRef.current.has(key) || selRef.current.has(def.area);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const target = isSel ? SELECTED : state.current?.hovered === mesh ? HOVER : dark ? REST_DARK : REST;
        if (mat.color.getHex() !== target) mat.color.setHex(target);
        mat.emissive.setHex(isSel ? 0x2f4a2e : 0x000000);
        mat.emissiveIntensity = isSel ? 0.25 : 0;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onMove);
      controls.dispose();
      renderer.dispose();
      for (const mesh of built.parts.keys()) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }
      el.innerHTML = '';
      state.current = null;
    };
  }, [bodyType, autoRotate, height]);

  return <div ref={mount} style={{ width: '100%', height, borderRadius: 18, background: 'var(--bg-card-soft)', overflow: 'hidden' }} />;
}
