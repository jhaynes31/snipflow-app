// Turns the preview build's index.html into a page fragment for hosted previews
// (the host supplies its own <html>/<head>/<body> wrapper).
import { readFileSync, writeFileSync } from 'node:fs'
const html = readFileSync('dist-preview/index.html', 'utf8')
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]).join('\n')
const out = [
  '<title>Love & Release</title>',
  pick(/<link rel="stylesheet"[^>]*>/g),
  '<div id="root"></div>',
  pick(/<script type="module"[^>]*><\/script>/g),
].join('\n')
writeFileSync('dist-preview/artifact.html', out + '\n')
console.log(out)
