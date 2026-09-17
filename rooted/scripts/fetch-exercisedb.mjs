#!/usr/bin/env node
/**
 * Downloads demo GIFs for the curated library from ExerciseDB (free V1 API) and
 * writes public/media/manifest.json mapping exerciseId -> local GIF path.
 * The app never calls ExerciseDB live; media is bundled and cached offline.
 *
 * Usage: EXERCISEDB_API_KEY=... node scripts/fetch-exercisedb.mjs
 *
 * // DECISION NEEDED: verify ExerciseDB licensing before shipping their GIFs.
 * The mapping below is name-based; edit MAPPING to pin exact ExerciseDB ids.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';

const KEY = process.env.EXERCISEDB_API_KEY;
const HOST = process.env.EXERCISEDB_HOST ?? 'exercisedb.p.rapidapi.com';
if (!KEY) { console.error('Set EXERCISEDB_API_KEY (RapidAPI key).'); process.exit(1); }

/** exerciseId -> ExerciseDB search name (best match is used). */
const MAPPING = {
  'sit-to-stand': 'chair squat', 'goblet-squat-box': 'dumbbell goblet squat', 'db-rdl': 'dumbbell romanian deadlift',
  'incline-push-up-counter': 'incline push-up', 'wall-push-up': 'push-up wall', 'db-floor-press': 'dumbbell floor press',
  'band-row': 'band seated row', 'db-row-one-arm': 'dumbbell one arm row', 'band-pull-apart': 'band pull apart',
  'glute-bridge-block': 'glute bridge', 'wu-glute-bridge': 'glute bridge', 'dead-bug': 'dead bug', 'clamshell': 'side lying clam',
  'side-plank-knees': 'side plank', 'plank-knees': 'front plank', 'bird-dog': 'bird dog', 'wu-cat-cow': 'cat cow', 'cd-open-book': 'thoracic rotation',
  'db-farmer-carry': 'farmers walk', 'pallof-hold': 'band standing anti rotation', 'pt-seated-knee-extension': 'seated leg extension',
  'wu-calf-raise-supported': 'standing calf raise', 'cd-hip-flexor-block': 'kneeling hip flexor stretch', 'cd-figure-four': 'seated piriformis stretch',
};

mkdirSync('public/media/gifs', { recursive: true });
const manifestPath = 'public/media/manifest.json';
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

for (const [id, name] of Object.entries(MAPPING)) {
  try {
    const res = await fetch(`https://${HOST}/exercises/name/${encodeURIComponent(name)}?limit=1`, { headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST } });
    if (!res.ok) throw new Error(`${res.status}`);
    const [hit] = await res.json();
    if (!hit?.gifUrl) { console.warn('no match for', id); continue; }
    const gif = await fetch(hit.gifUrl);
    const buf = Buffer.from(await gif.arrayBuffer());
    const file = `public/media/gifs/${id}.gif`;
    writeFileSync(file, buf);
    manifest[id] = { type: 'gif', src: `/media/gifs/${id}.gif`, credit: `ExerciseDB: ${hit.name}` };
    console.log('saved', id, '<-', hit.name);
  } catch (e) {
    console.warn('failed', id, String(e));
  }
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('manifest written with', Object.keys(manifest).length, 'entries');
