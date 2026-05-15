# Prophecy AI — Artificial Intelligence Capability Report

This document describes how **AI** is integrated into Prophecy AI: what it does, where it runs, what data it touches, and how the product uses it for customers and administrators.

---

## 1. Executive summary

Prophecy AI uses a **single LLM provider (Groq)** for two complementary capabilities:

1. **Structured natural-language search** — Users type free-form queries; the model returns **JSON filters** (city, price ceiling, bedrooms, etc.) that drive Prisma queries against listings.
2. **Listing summarization** — For a chosen property, the model returns a **three-bullet JSON summary** (key feature, value-for-money, location perk) tuned for buyers, with server-side validation so pricing stays concrete when a list price exists.

Every successful smart-search path can persist the **original query text** and **extracted filters** in Postgres (`AiLog`) for auditing and analytics. Summarization calls are **not** logged to `AiLog` by default (they are on-demand per listing).

---

## 2. Technology stack (AI layer)

| Component | Role |
|-----------|------|
| **Groq Chat Completions** | `POST https://api.groq.com/openai/v1/chat/completions` — OpenAI-compatible API, low-latency inference. |
| **Implementation** | `src/lib/groq/chat-json.ts` — `groqChatJsonContent(system, user)` returns assistant text; prefers `response_format: json_object`, falls back if the model rejects JSON mode. |
| **Default model** | `llama-3.3-70b-versatile` (override with `GROQ_MODEL`). |
| **Temperature** | `0.1` for deterministic, schema-friendly outputs. |

**Environment variables (AI-relevant)**

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | Required for any LLM call (alias `GROK_API_KEY` also read). |
| `GROQ_MODEL` | Optional; overrides default Groq model id. |

No Gemini or OpenAI keys are required for the current AI features; the codebase is Groq-centric.

---

## 3. Use case A — Natural language → structured search

**User-facing entry points**

- Customer portal: **AI search** (`/portal/search`) → `POST /api/ai-search`.
- Authenticated **smart search** (`GET /api/search?query=...`) uses the same extraction pattern for broader filter shapes (city, area, bedrooms, property type, max price).

**Pipeline (conceptual)**

1. User submits a natural-language string.
2. Backend calls Groq with a **strict JSON schema description** in the system prompt (keys, null rules, numeric rules).
3. Response is parsed and **normalized** into typed filters (`PortalAiFilters` / search route equivalents).
4. Prisma builds a `Property` query (`AVAILABLE` listings, optional location / price / bedroom clauses).
5. If a bedroom filter yields zero rows, the app may **relax** that filter once and retry (documented in API responses as `relaxedBedroomFilter`).
6. **AiLog** row: `queryText`, `extractedFilters` (JSON), `userId`, `createdAt` — wrapped in a DB transaction with a **savepoint** so a logging failure does not discard search results.

**Value for the product**

- Lowers the bar for non-technical users: they do not need to learn form fields.
- **Explainability**: stored `extractedFilters` lets admins inspect what the model understood vs. what the database returned.

---

## 4. Use case B — Property summarization (“Summarise with AI”)

**Entry point**

- `POST /api/portal/properties/[id]/summarize` (customer session required).

**Logic**

- `src/lib/ai/property-summary.ts` builds a structured user block (title, PKR price as authoritative, location, category, full description).
- Groq returns JSON with exactly: `keyFeature`, `valueAssessment`, `locationPerk`.
- Server **post-processes** `valueAssessment` to avoid vague pricing when a numeric/list price exists (`enforceConcreteValueAssessment`).

**Value for the product**

- Skim long descriptions quickly.
- Keeps **price-grounded** copy suitable for a regulated or trust-sensitive domain.

---

## 5. Data model — `AiLog` (AI audit trail)

Prisma model `AiLog`:

- `queryText` — raw user query.
- `extractedFilters` — JSON blob (structured filter object after normalization).
- `userId` — who triggered the search.
- `createdAt` — timestamp.

**Admin UI**

- `/dashboard/admin/ai-logs` — last **400** rows joined with `User` (name, email, role) for review.

**Dashboard aggregate**

- Admin home stats include total **AI search query** count (`AiLog` row count).

---

## 6. API surface (AI-specific)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/ai-search` | NL query → Groq → properties + optional AiLog. |
| `GET` | `/api/search` | Query param search → Groq → properties + optional AiLog. |
| `POST` | `/api/portal/properties/[id]/summarize` | Listing → Groq → three-bullet summary. |

---

## 7. Resilience, limits, and operations

**Rate limiting**

- Groq **429** responses are mapped to HTTP 429 with optional `Retry-After` / `retryAfterSeconds` for clients.

**Malformed model output**

- JSON parse errors on the filter path → user-facing **502** with a clear message where implemented.

**Database consistency**

- Search flows run property reads and AiLog insert inside **`runPivotalTransaction`**; AiLog uses **`tryWithSavepoint`** so the log insert can fail without rolling back listing results.

**Key management**

- Missing `GROQ_API_KEY` surfaces as a configured error path (do not expose the key in client bundles; keys are server-only).

---

## 8. Product map — where AI appears in the UI

| Audience | Surface | AI behavior |
|----------|---------|-------------|
| **Customer** | Portal AI search | NL → filters → listing cards. |
| **Customer** | All listings | “Summarise with AI” per property. |
| **Admin / Agent** | AI logs | Read-only audit of queries + extracted JSON. |
| **Admin** | Dashboard | High-level count of AI queries logged. |

---

## 9. Gaps and extension ideas (not implemented)

- **No** RAG over documents or vector DB for this codebase’s AI features.
- **No** automated valuation or legal advice — summaries are marketing-style assists only.
- Possible extensions: multilingual prompts, summarization logging to `AiLog` or a separate table, A/B models via `GROQ_MODEL`, guardrails / content filters, explicit PII redaction before sending text to Groq.

---

## 10. Document control

| Field | Value |
|-------|-------|
| Product | Prophecy AI |
| Focus | AI integration report |
| Primary LLM runtime | Groq (`groqChatJsonContent`) |

For raw SQL patterns touching `AiLog`, see `QUERIES.txt` in this repository.
