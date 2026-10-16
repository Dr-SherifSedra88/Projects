# NutriClinic Pro — Production Deployment Path (Backend & Security)

This document specifies how to take the standalone browser build to a **multi-user, multi-device
clinical deployment**. Nothing here is required for the standalone build; it is the upgrade contract.

---

## 1 · Target architecture

```
┌─────────────────────┐        HTTPS (TLS 1.2+)        ┌───────────────────────────────┐
│  Clinic workstation │  ───────────────────────────▶  │  API server (Node/NestJS or   │
│  (same UI code,     │      REST + JSON, JWT cookie   │  FastAPI) — stateless, 2+     │
│   served statically)│  ◀───────────────────────────  │  replicas behind a proxy      │
└─────────────────────┘                                └───────────┬───────────────────┘
                                                                   │
                     ┌──────────────┬──────────────┬───────────────┼─────────────────┐
                     ▼              ▼              ▼               ▼                 ▼
              PostgreSQL 14+   Object storage   Redis (cache &  Outbound:        Audit log
              (RLS per clinic) (files, S3-like)  sessions/queue) AI provider      (append-only)
```

- **Front end** stays the current codebase (static). Point it at the API by replacing the storage
  adapter layer (`js/store.js` is deliberately the only module that talks to persistence; swap its
  methods for `fetch()` calls to the endpoints below — the rest of the app is untouched).
- **Server** holds all secrets: database credentials, AI keys, search keys.

## 2 · REST API contract (summary)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` (httpOnly, SameSite=Strict cookies; CSRF token) |
| Patients | `GET/POST /patients` · `GET/PATCH/DELETE /patients/:id` · `POST /patients/:id/weights` |
| Assessments | `GET/POST /patients/:id/assessments` · `PATCH/DELETE /assessments/:id` |
| Measurements | `GET/POST /patients/:id/measurements` |
| Energy plans | `GET/POST /patients/:id/energy-plans` · `POST /energy-plans/:id/approve` |
| Diet plans | `GET/POST /patients/:id/plans` · `GET /plans/:id` · `POST /plans/:id/versions` · `POST /plans/:id/approve` |
| Follow-ups | `GET/POST /patients/:id/followups` |
| Foods | `GET /foods` · `POST /foods` (custom) · `POST /recipes` |
| KB / files | `POST /files` (multipart) · `GET /files/:id` · `GET/POST /kb-documents` |
| Copilot | `POST /copilot/run` (server-side: engine + optional LLM + RAG) · `POST /copilot/research` |
| Reports | `POST /reports/export` (server-side PDF rendering optional) |
| Admin | `GET /audit-log` · `POST /backups` · `GET /exports/patient/:id` · `DELETE /patients/:id` (GDPR-style) |

All resources are scoped by the authenticated user's `clinic_id`; row-level security enforces this
in PostgreSQL as defence-in-depth.

## 3 · Authentication & authorization

- Password hashing: **Argon2id** (or bcrypt cost ≥ 12). MFA (TOTP) optional per clinic.
- Sessions: server-side sessions (Redis/Postgres) with httpOnly secure cookies; short idle timeout
  (e.g. 30 min) + absolute lifetime (12 h); “lock workstation” button in UI.
- **RBAC roles**: `admin` (clinic settings, users, backups, audit), `clinician` (full clinical
  workflow incl. approvals), `assistant` (data entry, no approvals/export), `readonly` (view only).
- Every approval (energy target, diet plan) records `approved_by` + timestamp.

## 4 · Data protection

| Concern | Measure |
|---|---|
| In transit | TLS 1.2+ everywhere; HSTS; no clinical data over plain HTTP |
| At rest | PostgreSQL encryption (TDE or filesystem LUKS), encrypted object storage, encrypted backups |
| Backups | Automated daily full + WAL archiving; tested restore procedure; 30-day retention default |
| Audit | Append-only `audit_log` for logins, record changes, exports, approvals, deletions |
| Minimisation | External AI/search calls de-identified by default (name/ID/contact stripped — see `copilot.deidentify()`); never transmit identifiers to public engines |
| Consent | `consents` table; data export & deletion workflows per patient |
| Files | Antivirus scan on upload; content-type validation; per-clinic storage prefix |
| Secrets | AI/search keys only on the server; rotate quarterly; never in front-end source |

**Compliance**: designed to support Egyptian Personal Data Protection Law (PDPL 151/2020)
requirements and general clinical-good-practice expectations (least privilege, auditability,
recoverability). Obtain legal/security review before clinical go-live, as required by the clinic's
jurisdiction. Nothing in this document is legal advice.

## 5 · AI & knowledge pipeline (server-side)

1. **Deterministic first**: all calculations stay in the engine (port `js/engine.js` /
   `js/planner.js` to shared server code or call them in a sandboxed Node worker — same functions,
   same results).
2. **Retrieval (RAG)**: index `kb_documents.text_content` + the built-in briefs (PostgreSQL full-text
   or a vector store). Retrieval respects the evidence hierarchy in the app (patient constraints →
   guidelines → food databases → uploads → external sources) and surfaces citations.
3. **Optional LLM**: server-side proxy to a clinical-tuned LLM; the system prompt matches the app's
   Copilot contract (draft-only outputs, no medication changes, structured response). De-identify
   before any external call; keep an internal opt-out toggle per clinic.
4. **Optional internet research**: server-side search API with allow-listed reputable domains
   (WHO, USDA FDC, NIH/ODS, ESPEN, ASPEN, AHA, ADA, PubMed); return source name + URL + access date;
   never fabricate references; graceful “unavailable” state when the search provider is down.
5. **Everything the AI produces stays `status = draft` until a clinician approves it.**

## 6 · Migration from the standalone build

- **Settings → Data → Export** produces a JSON bundle (patients, assessments, measurements, energy
  plans, diet plans, follow-ups, templates, KB metadata, files as base64 where ≤ 2.5 MB).
- Import server-side maps 1:1 to the schema in `database-schema.sql`
  (arrays → child tables, JSONB columns kept as-is).
- After migration, switch the front end to the API adapter and disable local writes.

## 7 · Deployment checklist (single-clinic, pragmatic)

1. Provision: 1 small VM (2 vCPU / 4 GB) + managed PostgreSQL + S3-compatible bucket. Docker Compose is sufficient to start.
2. Configure HTTPS (reverse proxy + Let's Encrypt), then deploy API + static front end.
3. Create the clinic + admin user; import food database defaults (bundled in the app).
4. Load clinic logo & identity; upload reference documents to the KB.
5. Run the end-to-end rehearsal: register test patient → labs → energy target approval → plan →
   PDF → follow-up → reassessment; verify audit entries for each step.
6. Train staff on: approval gates, backup exports, incident reporting; schedule quarterly restore tests.

## 8 · Known standalone-build limitations (to close in server mode)

| Limitation | Server mode resolution |
|---|---|
| Data per browser/device only | Central PostgreSQL; multi-device sync |
| No real accounts (device-level workspace) | Auth + RBAC + sessions |
| AI free-form blocked by preview CSP | Server proxy with keys kept server-side |
| PDF via browser print dialog | Optional server-side PDF renderer (Arabic-capable fonts) |
| File uploads stored locally | Object storage + scanning |
| Single-writer | Multi-user concurrency + audit |
