<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Shipping changes to The Shire

Jen (2026-10-30): a change she asks for is already approved to go live. Don't ask whether to "put it live": build it, run the checks (`npm run typecheck`, `npm test`, lint on the changed files, `npm run build` in `hub/`), open the pull request, merge it into `main` (Vercel deploys from `main`), and tell her in plain words what changed and what to do. She isn't a developer; walk her through anything she needs to do herself.
