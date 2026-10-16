# NutriClinic Pro — Build State & Handoff Workflow

> If this build is interrupted (credits/time), resume from this file.
> Last updated: 2026-10-15 (build session 1)

## What this is
A premium clinical nutrition & patient-management platform ("NutriClinic Pro"), delivered as a
self-contained **static site** (no build step, no external assets) at:

`C:\Users\ot\.openclaw-autoclaw\workspace\projects\website-8fb4f824e29ad0478ac0cbed\`

Hosting contract: function-compute `nginx` environment, `entryFile: index.html` (site root = project dir).
Strict CSP: every asset must ship with the site; no CDN, no external fonts, no runtime third-party calls.

## Current status — BUILD COMPLETE ✅ (verified · pushed to git · preview deploy triggered)
- [x] All source files authored (13 modules, engines, data, i18n, reports)
- [x] Browser render check — Playwright UI suite **31/31 passed** (desktop + mobile + RTL), console clean
- [x] Node logic smoke test — **49/49 passed**
- [x] README.md + docs/database-schema.sql + docs/backend-and-security.md written
- [x] Temporary QA pages (qa-smoke.html, qa-tiny.html) removed from site root
- [x] Pushed to GitHub `Dr-SherifSedra88/Projects` → `nutriclinic-pro/`
- [x] `projects/projects.json` updated → platform preview deployment triggered
- [x] index.html shell + css/app.css + css/print.css + assets/favicon.svg
- [x] js/core.js — utils, icons, toasts, modals/drawers
- [x] js/i18n.js — full EN/AR dictionary (RTL support)
- [x] js/data-foods.js — 152 foods (Egyptian 100-kcal exchange portions + standards)
- [x] js/data-approaches.js — 20 therapeutic approaches, compatibility matrix, meal templates
- [x] js/data-references.js — 22 clinical briefs + evidence hierarchy + external sources
- [x] js/store.js — IndexedDB layer, backup/restore, demo seed (3 patients, plans, follow-ups)
- [x] js/engine.js — deterministic BMR/TDEE/deficit/surplus/macros/safety/progress/reassessment
- [x] js/charts.js — dependency-free SVG charts
- [x] js/planner.js — diet plan generator + editor ops + smart exchange + diff + templates
- [x] js/copilot.js — AR/EN intent interpreter, KB search, optional external-LLM adapter
- [x] js/pdf.js — branded/plain A4 reports + print pipeline
- [x] js/views-core.js / views-clinical.js / views-planning.js / views-library.js — all 13 modules
- [x] js/app.js — shell, routing, first-run setup, patient context
- [x] Node logic smoke test: 49/49 passed (.openclaw/tmp/qa-smoke.js)
- [x] Node logic smoke test: 49/49 passed (.openclaw/tmp/qa-smoke.js)
- [x] Browser render check — Playwright UI suite 31/31 passed; screenshots qa-01…qa-16 archived
- [x] README.md, docs/database-schema.sql, docs/backend-and-security.md  ← done
- [x] qa temp pages removed from site root
- [x] projects/projects.json updated (deploy trigger) — DONE

## Key invariants (do not break)
- **No green anywhere** (design rule); palette: navy #14213D / burgundy #800020 / gold #C6A667.
- All calculations are deterministic engine functions (engine.js / planner.js) — never AI-generated numbers.
- AI Copilot: algorithmic mode is real; external LLM is optional & documented (blocked by preview CSP).
- Content language: English primary UI + full Arabic (toggle). Site has no external URLs except
  user-clicked "inert" links in Clinical References (allowed by hosting policy).
- Data persists in browser IndexedDB (standalone build); production path documented in docs/.

## Verification playbook (resume here)
1. Syntax: `cd <projectDir>; foreach ($f in (Get-ChildItem js/*.js).Name) { node --check "js/$f" }`
2. Logic smoke: `node C:\Users\ot\.openclaw-autoclaw\workspace\.openclaw\tmp\qa-smoke.js` → expect `49 passed, 0 failed`
3. External-ref audit (must be empty except intentional inert links):
   `Select-String -Path index.html,css/*.css,js/*.js -Pattern 'https?://'` → only docs/readme + refs view data.
4. Render check options:
   a. Edge headless screenshot:
      `& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --disable-gpu --no-first-run --user-data-dir=<tmp profile> --virtual-time-budget=20000 --screenshot=out.png --window-size=1440,950 http://127.0.0.1:8617/<page>`
      Local server: `python -m http.server 8617 --bind 127.0.0.1` (run in project dir).
      NOTE: seed the profile first via `qa-smoke.html` (redirects to index.html), then screenshot index.html with same profile.
      If --screenshot produces no file: try old flag `--headless` (deprecated but works), or kill leftover
      msedge processes matching the QA profile dir before each run.
   b. jsdom alternative: `npm install jsdom` in a temp folder, load index.html, await CN.app init, assert `#view` contains expected text.
5. After verification: delete qa-smoke.html, re-run audit step 3, then update projects.json.

## Deploy step (LAST, triggers preview upload)
Read `projects/projects.json`, append this project object (preserve all existing items + deploymentResult):
```json
{
  "id": "website-8fb4f824e29ad0478ac0cbed",
  "name": "NutriClinic Pro — Clinical Nutrition & Patient Management Platform",
  "type": "website",
  "folderName": "website-8fb4f824e29ad0478ac0cbed",
  "entryFile": "index.html",
  "createdAt": "<now ISO>",
  "updatedAt": "<now ISO>",
  "deployment": { "provider": "function-compute", "environment": "nginx", "autoPreview": true }
}
```
Validate: JSON parses, top-level array, target id present exactly once, other projects intact.

## Remaining deliverables to write (templates available in this dir)
- `README.md` — run/modify/quality documentation (per delivery protocol).
- `docs/database-schema.sql` — PostgreSQL schema for production server path.
- `docs/backend-and-security.md` — API contract, auth/RBAC, encryption, audit, deployment notes.
