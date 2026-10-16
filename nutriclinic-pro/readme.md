# NutriClinic Pro — Clinical Nutrition & Patient Management Platform

A premium, **self-contained clinical workstation** for a private nutrition clinic.
Runs entirely in the browser — **no build step, no server, no external assets** (works fully offline).

> This is the standalone/static build. A production server deployment path (PostgreSQL + API +
> authentication) is documented in [`docs/backend-and-security.md`](docs/backend-and-security.md)
> with the database schema at [`docs/database-schema.sql`](docs/database-schema.sql).

---

## 1 · Open / Run

| Way | Steps |
|---|---|
| **Direct** | Double-click `index.html` (modern Chrome / Edge). |
| **Local server (recommended)** | `cd` to this folder → `python -m http.server 8000` → open `http://localhost:8000/` |
| **Hosted preview** | Deployed via the managed static host; the preview URL is added by the platform after upload. |

First run: a setup dialog appears — enter the clinic name / physician name, choose the interface
language, then pick **Load sample workspace** (3 demo patients with labs, energy targets, diet
plans and follow-ups) or **Start empty workspace**.

> Demo data can be cleared anytime: **Settings → Data → Erase all data**.

---

## 2 · Modules (sidebar)

| # | Module | What it does |
|---|---|---|
| 1 | **Dashboard** | KPIs (patients, new this month, upcoming/missed follow-ups, pending approvals), recent records, quick actions, weight-trend chart |
| 2 | **Patients** | Search/filter electronic records, open the full patient drawer (overview, labs, measurements, plans, follow-ups, files), archive/restore |
| 3 | **New Patient** | Complete registration: personal, anthropometric, medical history, lifestyle, goal, consent, plus **custom fields** (defined in Settings without touching code) |
| 4 | **Clinical Assessment** | Laboratory panels with units & per-lab reference ranges, chronological history, abnormal-value flags, attachments, missing-data checklist, nutritional safety scan |
| 5 | **Energy Calculator** | Deterministic BMR (Mifflin-St Jeor / Harris-Benedict / revised HB / Katch-McArdle / Cunningham / device-measured), TDEE with activity factors, guideline-informed deficit/surplus options, safety floors & flags, macro targets — clinician approval transfers the calorie target to the builder automatically |
| 6 | **Body Composition** | Timeline of weight, body-fat %, muscle mass, visceral fat, TBW, waist/hip; trend charts; visit comparison |
| 7 | **Diet Plan Builder** | Deterministic plan generator over ~152 foods (Egyptian 100-kcal exchange portions + standards), 20 therapeutic approaches with compatibility checks & contraindications, editable meals, **Smart Replace** exchange engine, live macro totals, target-deviation warnings, version history & diff, reusable templates, 1/3/7/14/custom-day plans |
| 8 | **AI Nutrition Copilot** | Patient-aware command interpreter (Arabic / English / mixed): generate plans, exclude foods, swap ingredients, adjust targets, summarize patients, maintenance plans, modify previous plans — all as **drafts requiring clinician approval**. Free-form LLM mode is optional and server-configurable (see docs) |
| 9 | **Follow-Up Management** | Visit records (measurements, adherence, appetite, GI, feedback, med changes), progress analysis vs expected trend, **intelligent calorie reassessment** (previous vs suggested target — clinician approval required), visit comparison |
| 10 | **Food Database** | Searchable EN/AR foods, 100-kcal clinical portions, household measures (tbsp/tsp/cup/pieces), fiber/sodium/GI/allergen tags, custom foods + recipe builder with automatic nutrient calculation |
| 11 | **Clinical References** | 22 built-in clinical briefs distilled from the course reference set, evidence hierarchy, upload of PDF/DOCX/XLSX/CSV/TXT documents (stored locally; text files become searchable for the Copilot), reputable external source links, de-identified research helper |
| 12 | **Reports & PDF** | A4 report composer — **branded clinic report** or **plain print mode**, editable templates (heading, font size, sections, signature), on-screen preview, print / save-as-PDF; supports Arabic RTL |
| 13 | **Settings** | Clinic identity & logo, interface language (EN/AR), units, default BMR equation & activity factors, deficit/surplus preferences, plan duration, portion display, follow-up interval, custom clinical fields, AI configuration, data backup/restore/wipe |

---

## 3 · Clinical workflow (how data flows)

```
New Patient ➜ Clinical Assessment (labs, BP, attachments)
                    │
                    ▼
        Energy Calculator  ── BMR → TDEE → deficit/surplus → TARGET (clinician-approved)
                    │                                   (auto-transferred — no re-entry)
                    ▼
        Diet Plan Builder  ── approaches + restrictions → generated draft → edits / Smart Replace
                    │                                   → checks (kcal, macros, sodium, exclusions)
                    ▼
        Reports & PDF  ── branded or plain A4 output
                    │
                    ▼
        Follow-Up  ── measurements + adherence → progress analysis → calorie reassessment
                    │                                   (previous vs suggested — approval required)
                    ▼
        Modifications  ── new plan versions; all history preserved
```

- **All numbers are computed by deterministic, testable engine functions** (`js/engine.js`,
  `js/planner.js`) — never by AI. The Copilot consumes engine results and keeps every output as a
  draft for clinician approval.
- **Safety**: calorie floors and flags (pregnancy, eating-disorder history, CKD, older adults,
  sub-BMR targets, PSMF-level <800 kcal), sodium/macro deviation warnings, exclusion scanning that
  never knowingly includes a prohibited ingredient, and "verify" flags when ingredient data is
  incomplete.

## 4 · File map (key files to edit)

```
index.html            entry — page shell, script order, theme token block
css/app.css           design system: colors, layout, components (edit CSS variables at top)
css/print.css         A4 print stylesheet
js/core.js            utilities, icon set, toasts, modals/drawers, Escape handling
js/i18n.js            EN/AR dictionary — all UI strings
js/data-foods.js      food database (edit/add foods here)
js/data-approaches.js 20 approaches, compatibility matrix, meal templates, exclusion id-sets
js/data-references.js clinical briefs + external sources
js/store.js           IndexedDB persistence, backup/restore, demo seed
js/engine.js          BMR/TDEE/targets/macros/safety/progress/reassessment calculations
js/charts.js          dependency-free SVG charts
js/planner.js         plan generator, editor operations, Smart Replace, warnings, diff, templates
js/copilot.js         command interpreter + KB search + optional external LLM adapter
js/pdf.js             report composition + print pipeline
js/views-*.js         the 13 module views (core / clinical / planning / library)
js/app.js             app shell, routing, first-run setup, patient context
docs/                 production path docs (schema, backend/security), build state
```

### Common modifications
| To change… | Edit |
|---|---|
| Brand colors / accent | CSS variables `:root` in `css/app.css` (theme tokens also overridable in `index.html`) |
| Any UI wording / translation | `js/i18n.js` (EN + AR entries) |
| Food data, portions, tags | `js/data-foods.js` |
| Diet approaches, macros, rules | `js/data-approaches.js` |
| Clinical briefs | `js/data-references.js` |
| Calculation formulas / safety ranges | `js/engine.js` |
| Plan generation logic | `js/planner.js` (`generate`, `slotPlan`) |
| Clinic name/logo default | Settings module at runtime (stored per device) + `defaultSettings()` in `js/store.js` |

---

## 5 · Quality coverage

- **Responsive**: desktop-first (≥1360 px grids, 2-column layouts), tablet & mobile (single column,
  off-canvas sidebar with burger, horizontally scrollable tables, stacked action bars).
- **States**: designed empty states for every list, loading (boot splash + async guards), error
  banners with recovery hints; hover / focus-visible / disabled / active states on all controls;
  destructive actions always confirm.
- **Forms**: required fields, numeric parsing (accepts Arabic-Indic digits), inline validation,
  safe defaults, "verify" flags for incomplete allergen data.
- **Accessibility**: keyboard reachable controls, Esc closes topmost modal/drawer, focus rings,
  semantic tables/dialogs, aria labels on icon buttons, `lang`/`dir` switch for Arabic RTL.
- **Bilingual**: full English + Arabic UI with correct RTL rendering; food names in both languages.
- **Safety**: no green anywhere (per clinic design rule), clinician-approval gates on all AI/plan
  outputs, deterministic calculations, audit-friendly versioning of plans and energy targets.
- **Privacy**: no external requests at runtime; patient data stays in the device's IndexedDB;
  AI keys (if configured) stay client-side in this standalone build — production moves them server-side.

## 6 · Verification

- Node logic test suite: 49/49 checks (engine math, macro targets, plan generation determinism,
  exclusion integrity, copilot intents AR/EN, report builders, store round-trips).
- Playwright UI pass over every module (render, interactions, modals, mobile viewport, RTL switch,
  persistence after reload) — screenshots archived with the build. Latest run: see commit notes.
- Static audit: no external asset references beyond user-clicked inert links (hosting CSP-safe).

## 7 · Limitations (standalone build)

- Data is stored per-browser/device (IndexedDB). Use **Settings → Data** to export a JSON backup
  regularly. Multi-device / multi-user operation requires the server deployment (documented).
- Copilot free-form LLM mode requires a server-side proxy (keys must never live in a front end) —
  the hosted preview blocks external calls by design; algorithmic mode works everywhere.
- PDF export uses the browser's print dialog ("Save as PDF") — page numbers come from the print
  dialog's headers/footers option.
