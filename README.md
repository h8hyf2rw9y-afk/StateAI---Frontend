# PropPilot — Frontend

PropPilot is the first product built under **State AI**: an AI-first CRM designed specifically for real estate professionals. It centralizes the sales process — properties, leads, pipeline, and appointments — and is architected so AI agents can eventually prioritize an agent's day instead of just displaying data back at them.

This repository is the **frontend only**. It connects to a real FastAPI backend (Supabase/PostgreSQL) for essentially every real CRM feature now — the backend lives in a separate repository ([StateAI - Backend](https://github.com/h8hyf2rw9y-afk/StateAI---backend)). This top section of the README predates that backend and is kept below largely for historical/architectural-decision context; treat the "Status" line and each feature's own section (Dashboard, AI agent integration, etc.) as the current source of truth over this paragraph.

## Status

🚧 Real Supabase authentication (email/password + Google OAuth) and route protection, self-service account onboarding (a brand-new sign-in provisions its own organization automatically — see [How authentication works](#how-authentication-works)), and a real FastAPI backend behind Leads, Properties, Buyer search + Buyer Matching, Pipeline, Appointments, Tasks, a real Dashboard, and all three read-only AI agents (Lead Intelligence, Follow-up, Pipeline) via a real AI Assistant page. See [What's mocked](#whats-mocked-vs-real) below for what (if anything) in that section is now stale.

## Tech stack

- **Next.js 16** (App Router, Turbopack, Proxy)
- **React 19** + **TypeScript** (strict mode)
- **Tailwind CSS v4**
- **shadcn/ui** (on top of [Base UI](https://base-ui.com), not Radix — shadcn's current default; see [Architectural decisions](#architectural-decisions))
- **Supabase Auth** (`@supabase/supabase-js` + `@supabase/ssr`) — email/password and Google OAuth
- **lucide-react** for icons
- **ESLint** (`eslint-config-next`)
- **Vitest** + **React Testing Library** for tests

## Getting started

```bash
npm install
cp .env.example .env.local
# then fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY —
# see "Supabase configuration" below for exactly where to find them.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Signed out, you're redirected to `/login`; sign up or sign in and you land on `/dashboard`. Without the two Supabase env vars set, the app still builds and runs, but every page that touches auth (login, register, the dashboard shell, `/auth/callback`) will error when actually used — see [Supabase configuration](#supabase-configuration) to set it up for real.

Other scripts:

```bash
npm run build       # production build
npm run start        # serve the production build
npm run lint          # ESLint
npm run typecheck      # tsc --noEmit
npm run test             # run the Vitest suite once
npm run test:watch        # Vitest in watch mode
```

## Project structure

```
app/
  (auth)/            # login, register — no shared chrome
  (dashboard)/         # every authenticated page, wrapped in DashboardShell
                          # (force-dynamic — never statically prerendered, see below)
  auth/callback/         # OAuth code exchange (Google) — app/auth/callback/route.ts
  layout.tsx               # root layout: fonts, dark theme, TooltipProvider
  page.tsx                   # redirects "/" -> "/dashboard" or "/login" based on session

proxy.ts               # Next 16's renamed Middleware — refreshes the Supabase
                          # session and enforces route protection on every request

components/
  ui/                # shadcn/ui primitives (generated — avoid hand-editing)
  layout/             # sidebar, header, dashboard/auth shells, user menu
  navigation/           # centralized nav config + active-state NavLink
  shared/                # cross-feature building blocks (PageHeader, StatCard,
                            SectionCard, EmptyState, Logo)

features/
  auth/                # real Supabase auth UI + helpers
    validation.ts          # client-side form validation (no schema library)
    lib.ts                   # auth-error-message mapping, display name/avatar helpers
    components/                # LoginForm, RegisterForm, GoogleButton, PasswordInput, ...
  leads/ properties/ pipeline/ appointments/ tasks/ ai/ dashboard/
    types.ts             # domain types for that feature
    mock-data.ts           # realistic placeholder data
    components/              # feature-specific UI
    lib.ts                     # (dashboard only) selectors that derive
                                  dashboard widgets from the other features'
                                  mock data — the seam to replace with real
                                  queries later

lib/
  api/                # typed client for the future FastAPI backend
  supabase/             # Supabase client setup — see "How authentication works" below
    client.ts               # browser client (Client Components)
    server.ts                 # server client (Server Components/Actions/Route Handlers)
    proxy.ts                    # session-refresh + route-protection logic used by proxy.ts
    env.ts                        # reads/validates the two NEXT_PUBLIC_SUPABASE_* vars
  format.ts               # currency/date/initials formatting helpers
  utils.ts                  # shadcn's `cn` class-merge helper (reserved path)

types/                # cross-cutting types (User, Organization, ApiResult)
hooks/
  useUser.ts             # client hook for the reactive Supabase auth state
  use-mobile.ts             # responsive breakpoint hook
tests/                # Vitest unit + component tests
```

## The API layer

Every future HTTP call is meant to go through `lib/api/`, never through a raw `fetch` in a component:

```
Component → lib/api/<domain>.ts → lib/api/client.ts (apiRequest) → NEXT_PUBLIC_API_URL
```

- `lib/api/client.ts` — a thin `fetch` wrapper that reads `NEXT_PUBLIC_API_URL` and returns a discriminated `ApiResult<T>` (`{ ok: true, data }` or `{ ok: false, error }`) so callers handle failure without try/catch everywhere.
- `lib/api/contacts.ts` — **real, called today**: `getContacts()`/`getContact(contactId)`, calling the backend's actual `GET /api/v1/contacts` and `GET /api/v1/contacts/{contact_id}` — the CRM's real source of truth. See [Leads (real CRM contacts)](#leads-real-crm-contacts).
- `lib/api/properties.ts` — **real, called today**: `getProperties()`/`getProperty(propertyId)`, calling the backend's actual `GET /api/v1/properties` and `GET /api/v1/properties/{property_id}` — same conventions as `contacts.ts`. See [Properties (real CRM listings)](#properties-real-crm-listings). (Rewritten in place — it used to be a *speculative* stub, like `leads.ts`/`pipeline.ts`/`appointments.ts` below.)
- `lib/api/buyer-requirements.ts` / `lib/api/property-interests.ts` — **real, called today**: the "what is this client looking for?" workflow — see [Buyer search (real Buyer Requirements & Property Interests)](#buyer-search-real-buyer-requirements--property-interests).
- `lib/api/leads.ts` — typed functions (`getLeads`, `createLead`, …) matching a *speculative* backend shape (a `/leads` REST resource with no `/api/v1` prefix) that doesn't match how the real FastAPI backend actually models this data (`/api/v1/contacts`) — **none of these are called yet**. Left in place only because removing unused, never-called exports isn't any of the tasks that got Leads/Properties/Pipeline/Appointments real — don't treat its presence as confirmation `/leads` is a real route.
- `lib/api/pipeline.ts` — **real, called today**: `getOpportunities`/`getOpportunity`/`updateOpportunityStage`/`getOpportunityActivities`/`getTasksForOpportunity`/`getAppointmentsForOpportunity`, all hitting the real FastAPI backend — see [Pipeline (real CRM opportunities)](#pipeline-real-crm-opportunities). This file previously held a speculative `/pipeline/deals` stub — replaced, not added alongside.
- `lib/api/appointments.ts` — **real, called today**: `getAppointments(params?)`, hitting the real `GET /api/v1/appointments` — see [Appointments (real CRM data)](#appointments-real-crm-data). This file previously held a speculative `/appointments` stub (no `/api/v1` prefix, mock field names) — replaced, not added alongside.
- `lib/api/tasks.ts` — **new, real, called today**: `getTasks(params?)`, hitting the real `GET /api/v1/tasks` — see [Tasks (real CRM data)](#tasks-real-crm-data). No prior speculative version of this file existed.
- `lib/api/ai.ts` — **two of these are real and called today**: `getLeadIntelligence(contactId)` and `getFollowUpRecommendation(contactId)`, which call the actual backend's `POST /api/v1/ai/lead-intelligence/{contact_id}` and `POST /api/v1/ai/follow-up/{contact_id}` — see [AI agent integration](#ai-agent-integration). (`getAgents`/`getRecommendations` in the same file are still speculative, like the modules above — left in place, not called anywhere.)
- `lib/api/errors.ts` — `getApiErrorMessage()`, the generic HTTP-status-to-safe-copy mapping shared by every real API caller (contacts, properties, and — via `features/ai/lib.ts`'s `getAiErrorMessage`, which adds AI-specific cases on top — the AI panels too).

## What's mocked vs. real

| Area | Status |
|---|---|
| Login, Register, Google OAuth, logout, route protection | **Real** — Supabase Auth, see below |
| Session (name/email/avatar in the header, dashboard greeting, settings) | **Real** — read from the live Supabase session, never hardcoded |
| **Leads list and lead detail page (`/leads`, `/leads/[id]`)** | **Real** — actual backend CRM contacts, see [Leads (real CRM contacts)](#leads-real-crm-contacts) |
| **Properties list and property detail page (`/properties`, `/properties/[id]`)** | **Real** — actual backend CRM listings, see [Properties (real CRM listings)](#properties-real-crm-listings) |
| **"Buyer search" section on the lead detail page** | **Real** — actual backend Buyer Requirements & Property Interests, incl. create/edit/cancel and real property matching, see [Buyer search](#buyer-search-real-buyer-requirements--property-interests) |
| **Pipeline board and opportunity detail page (`/pipeline`, `/pipeline/[id]`)** | **Real** — actual backend Opportunities, incl. stage changes, linked tasks/appointments/activity history, see [Pipeline (real CRM opportunities)](#pipeline-real-crm-opportunities) |
| **Appointments list page (`/appointments`)** | **Real** — actual backend Appointments, incl. contact/property/opportunity links and a client-side search/status filter, see [Appointments (real CRM data)](#appointments-real-crm-data) |
| **Tasks list page (`/tasks`, new)** | **Real** — actual backend Tasks, incl. contact/property/opportunity/buyer-requirement links, overdue detection, and client-side search/status/priority filters, see [Tasks (real CRM data)](#tasks-real-crm-data) |
| Dashboard "Today's priorities" / hot leads / pipeline overview / "Available properties" count | Real UI, **derived from mock data** (`features/dashboard/lib.ts`, `features/properties/mock-data.ts`, `features/pipeline/mock-data.ts`) — still mock; wiring the Dashboard itself to real Opportunities/Contacts was out of scope for the task that made Pipeline real (see below) |
| **"Add lead" / "Add property" / "New opportunity" / "New task" / "Schedule appointment", and editing each** | **Real** — real `POST`/`PATCH` calls against the real backend, see [Create/edit flows](#createedit-flows) |
| Settings → "Save changes" | **Disabled** — profile editing isn't implemented yet |
| Lead detail page → **Lead Intelligence** and **Follow-up** panels | **Real** — calls the actual FastAPI backend, which calls a real local LLM (Ollama/llama3.2 today) — see [AI agent integration](#ai-agent-integration) |
| AI Assistant dashboard → agent cards | **Real status** (Lead Intelligence/Follow-up show "Available" and link to a lead; Sales Copilot stays "Coming soon") |
| AI Assistant dashboard → "Recent recommendations" list | Real UI, **hand-written placeholder copy**, not model output — there's no backend endpoint to scan every lead at once, and building one was out of scope (see [What remains to be implemented](#what-remains-to-be-implemented)) |
| Sales Copilot chat | **Inert placeholder** — no client state, no fake responses |

## How authentication works

Supabase Auth is the identity provider. There is no custom session/JWT handling anywhere in this repo — everything goes through `@supabase/ssr`, which is Supabase's official cookie-based session helper for SSR frameworks.

- **Sign up** (`features/auth/components/register-form.tsx`) calls `supabase.auth.signUp()` with `email`/`password`, storing first/last name in `options.data` (Supabase Auth's `user_metadata`). If the project requires email confirmation (the default), the form shows a "check your email" state instead of redirecting; if it doesn't, a session is already active and the form provisions the account immediately (see below).
- **Sign in** (`features/auth/components/login-form.tsx`) calls `supabase.auth.signInWithPassword()`, provisions the account, then redirects to `/dashboard` (or wherever `proxy.ts` originally bounced the user from, via `?next=`).
- **Google OAuth** (`features/auth/components/google-button.tsx`, used by both forms) calls `supabase.auth.signInWithOAuth({ provider: "google" })`, which redirects the browser to Google, then back to `app/auth/callback/route.ts`. That route exchanges the one-time `code` for a session server-side (`exchangeCodeForSession`), provisions the account, and redirects to `/dashboard` — the access/refresh tokens never appear in a URL or in client-side JS.
- **Account provisioning** (`lib/api/me.ts`'s `provisionMyOrganization`, added in the Organization & User Onboarding phase): a real Supabase session alone isn't enough to use the CRM — the backend's `users` bridge table needs a matching row (see `app/core/security.get_current_org_user`'s 403 branch, backend README's Authentication section) before organization-scoped data can resolve. This one idempotent `POST /api/v1/me/organization` call — made after *every* real sign-in above, not just the first — creates a brand-new `organizations` row plus that `users` row (`role: "owner"`) on first call, and is a safe no-op afterward. No new "organization name" field was added to the register form for this: the backend derives a sensible default from the same `first_name`/`last_name` metadata sign-up already collects. A failure here is swallowed, not shown as a login error — the Dashboard's own real-data loading already surfaces a clear error state if an account somehow still isn't provisioned.
- **Session persistence** is handled entirely by `@supabase/ssr` via cookies (never `localStorage`, and there's no custom token handling to audit). `lib/supabase/client.ts` is the browser client; `lib/supabase/server.ts` is the server client used in Server Components, Server Actions, and Route Handlers.
- **Logout** (`components/layout/user-menu.tsx`) calls `supabase.auth.signOut()`, then redirects to `/login`.
- **UI state** — "am I logged in, as whom" — comes from `hooks/useUser.ts`, a small client hook built on `supabase.auth.onAuthStateChange()`. It does not do any redirecting itself; it's for *display* only (the user menu, the dashboard greeting).

## How protected routes work

`proxy.ts` (Next.js 16 renamed Middleware to **Proxy** — same file convention and API) runs on every request. Its logic lives in `lib/supabase/proxy.ts` so it's testable independently:

1. Refresh the Supabase session (rewrites the session cookie if the access token was near expiry) — this must run before anything else, or sessions randomly drop.
2. If the request is for a protected route (`/dashboard`, `/leads`, `/properties`, `/pipeline`, `/tasks`, `/appointments`, `/ai-assistant`, `/settings`, or any sub-path) and there's no session, redirect to `/login?next=<original path>`.
3. If the request is for `/login` or `/register` and there **is** a session, redirect to `/dashboard`.

This is an "optimistic" check in Next.js's own terminology — it keeps signed-out users from ever seeing protected UI, but **it is not the final security boundary**. Once the FastAPI backend exists, it must independently verify the caller's Supabase JWT on every request; nothing in this frontend should be trusted as authorization by itself. `app/(dashboard)/layout.tsx` and `app/page.tsx` are also marked `export const dynamic = "force-dynamic"` so Next never bakes a build-time auth snapshot into a statically-generated page.

## AI agent integration

The first real, non-mocked connection between this frontend and the FastAPI backend — everything else in [What's mocked vs. real](#whats-mocked-vs-real) is still speculative. Flow:

```
Lead detail page (/leads/[id])
  → "Analyze lead" / "Generate follow-up" button (explicit user action — never automatic)
  → lib/api/ai.ts (getLeadIntelligence / getFollowUpRecommendation)
  → lib/api/client.ts (apiRequest) — attaches the current Supabase session's access token
  → POST /api/v1/ai/lead-intelligence/{contact_id} or /api/v1/ai/follow-up/{contact_id}
  → the backend's AI Gateway → the agent → LLMProvider → Ollama (llama3.2) or Anthropic
  → validated structured JSON back to the panel
```

- **`features/ai/components/lead-intelligence-panel.tsx`** / **`follow-up-panel.tsx`** — the two UI panels, rendered side by side on `/leads/[id]`. Both are `"use client"`, hold their own `idle`/`loading`/`success`/`error` state, and never call the AI on mount — only on the explicit button click, per this app's advisory-only AI principle.
- **`features/ai/types.ts`** — `LeadIntelligenceResult`/`FollowUpResult` (and their nested types) mirror the backend's own Pydantic schemas field-for-field (snake_case, not camelCased — there's no case-conversion layer). See that file's comment block for exactly which backend module each type mirrors.
- **`features/ai/lib.ts`** — `getAiErrorMessage()` maps the backend's HTTP status codes to safe, user-facing copy (never a raw provider/stack-trace message); `getPriorityBadgeClassName`/`getNextActionLabel`/`getChannelLabel`/`getFollowUpActionLabel`/`formatConfidence` are small presentational helpers shared between the two panels (and, for priority, with the dashboard's existing recommendation list).
- **Authentication**: `lib/api/client.ts`'s `apiRequest` now calls `createClient().auth.getSession()` (the same browser Supabase client `hooks/useUser.ts` already uses) and attaches `Authorization: Bearer <access_token>` to every request — no second auth system, no manual `localStorage` token handling. This makes `apiRequest` a browser-only (Client Component) API from here on, which is what every real caller today already is.
- **Security**: the frontend only ever sends `contact_id` in the URL — never an `organization_id`, never anything claiming to be an authorization decision. The backend independently verifies the bearer token and derives the caller's organization from it; a `contact_id` outside that organization gets a `404`, not a data leak. This is enforced entirely server-side (see the backend's own README) — the frontend has no way to override it even if it wanted to.
- **Timeouts**: `apiRequest` now aborts client-side after a configurable `timeoutMs` (default 30s — used by `lib/api/contacts.ts` and every other future caller) rather than waiting forever. The two AI functions pass `200_000` (200s) — comfortably above the backend's own `OLLAMA_TIMEOUT_SECONDS=180`, so the frontend never cancels a request the backend is still legitimately working on. Real measured latency on this project's CPU-only dev hardware is **93-125 seconds per call** — both panels show an explicit "Analyzing lead…" / "Generating follow-up recommendation…" loading state plus a "this may take up to a couple of minutes" note, specifically so that wait never looks like a frozen UI.
- **Error UX**: connection/provider failures, timeouts, and auth failures all render through the same `FormError` banner already used by the login/register forms — never a raw exception, stack trace, or internal detail (model name, provider, hardware). A `null` `suggested_message` renders "No message was generated." — the panel never fabricates one.
- **The lead detail page** (`app/(dashboard)/leads/[id]/page.tsx`) — this app had no per-entity detail page before Lead Intelligence/Follow-up were integrated; it now also loads the real contact behind that `id` — see [Leads (real CRM contacts)](#leads-real-crm-contacts).

## Leads (real CRM contacts)

The Leads list and detail page are the first CRM surface (as opposed to AI surface) wired to the real backend — `features/*/mock-data.ts` is no longer the source of truth for either. Same flow shape as [AI agent integration](#ai-agent-integration) above, one layer earlier:

```
Leads page (/leads) → features/leads/components/leads-table.tsx (fetches on mount)
  → lib/api/contacts.ts (getContacts)
  → lib/api/client.ts (apiRequest) — same bearer-token attachment as every other real call
  → GET /api/v1/contacts?limit=200
  → real Supabase-backed contacts for the caller's organization

Lead detail page (/leads/[id]) → getContact(id) → GET /api/v1/contacts/{id}
  → real contact, or a 404 if it doesn't exist / belongs to another organization
```

- **`features/leads/types.ts`** gained `Contact`/`ContactRole` (mirroring the backend's `ContactRead` field-for-field) alongside the existing, untouched `Lead` type — deliberately not consolidated into one type. `Lead` has `score`/`status`/`budget`/`interestedPropertyIds`/`nextAction`/`followUpDate`, none of which exist on the real `Contact`, and `Lead` is still used by the still-mock Pipeline and Dashboard features; stretching it to fit `Contact` would mean either fabricating fields the backend doesn't provide or breaking those other, out-of-scope features. `formatContactSource`/`formatContactRole` render the backend's soft-enum strings (`app/schemas/enums.py`'s `CONTACT_SOURCES`/`CONTACT_ROLE_KEYS`) as friendly labels, falling back to the raw string for anything unmapped — `source`/`roles` are typed as plain strings (matching the backend's own read schema, which doesn't re-validate them as a strict enum), so this can never crash on an unexpected value.
- **No fabricated columns**: the real contacts table shows only what `ContactRead` actually has — name, email, phone, role badges (real, from `roles`), source, and created date. The old mock table's Status, Score, Budget, "Interested in", "Next action", and "Follow-up" columns are gone — `Contact` has none of those fields, and inventing them would violate the whole point of this task. The status filter (a `PipelineStage`, which doesn't exist on `Contact`) was replaced with a role filter, computed from whatever roles are actually present in the loaded contacts rather than a hardcoded list.
- **`lib/format.ts` gained `formatTimestamp()`** for real backend timestamps (`created_at`/`updated_at`, e.g. `"2026-08-25T20:33:33.369852Z"`) — the existing `formatDate`/`parseLocalDate` exist specifically to work around *bare* `"YYYY-MM-DD"` strings being misread as UTC, and would actually break on a full timestamp (`parseLocalDate`'s `split("-")` assumes exactly three numeric parts). A full ISO timestamp already carries an explicit offset, so plain `new Date(iso)` is correct for it.
- **Loading/error/empty states**: both the list and detail page show a centered spinner + "Loading leads…"/"Loading lead…" while the request is in flight (never an empty table, per this task's requirement), the same `FormError` banner as the AI panels on failure (mapped through the new generic `getApiErrorMessage()`, not the AI-specific one — a plain contacts-fetch failure should never say "AI is currently unavailable"), and a genuine empty state ("No leads yet") when the organization has zero contacts — never a fallback to demo/mock data.
- **Security**: unchanged from [AI agent integration](#ai-agent-integration) — the frontend sends only `contact_id`/no id at all (for the list), never an `organization_id`; the backend alone determines organization scope from the verified bearer token, and a contact outside it is a `404`, not a leak.
- **AI integration is untouched**: `LeadIntelligencePanel`/`FollowUpPanel` still just take a `contactId` prop — they already worked with any real id passed to them (see [AI agent integration](#ai-agent-integration)), so wiring the detail page to a real `getContact(id)` call needed no changes to either panel.

## Properties (real CRM listings)

Built exactly the same way as [Leads (real CRM contacts)](#leads-real-crm-contacts) — same fetch-on-mount pattern, same `apiRequest`/bearer-token seam, same loading/error/empty-state shape:

```
Properties page (/properties) → features/properties/components/properties-grid.tsx (fetches on mount)
  → lib/api/properties.ts (getProperties) → GET /api/v1/properties?limit=200

Property detail page (/properties/[id]) → getProperty(id) → GET /api/v1/properties/{id}
  → real property, or a 404 if it doesn't exist / belongs to another organization
```

- **`features/properties/types.ts`**: the old mock type was also called `Property` — unlike `Lead`/`Contact` (already two different words), there was no natural second name for a *mock* listing, so the old type was renamed `MockProperty` (and its siblings `MOCK_PROPERTY_TYPES`/`MOCK_PROPERTY_STATUSES`/etc.), freeing up `Property` for the real backend entity going forward. This only touched `features/properties/mock-data.ts`'s own import — `app/(dashboard)/dashboard/page.tsx` (the only other consumer) imports the `mockProperties` *array*, never the type name, so it needed no changes.
- **Decimal fields are strings, confirmed against a real response, not assumed**: `price`, `construction_m2`, `land_m2`, `bathrooms`, `latitude`, `longitude` all come back as JSON *strings* (e.g. `"3400000.00"`), not numbers — FastAPI/Pydantic serializes `Decimal` this way to avoid float precision loss. `Property`'s type reflects that (`string | null`), and `formatPropertyPrice`/`formatArea` do the `Number(...)` conversion at render time rather than assuming a numeric type from the start (which would have either failed to compile or silently rendered "NaN" everywhere).
- **A different real enum, not the mock one**: the backend's real `property_type` (`house`/`apartment`/`land`/`commercial`/`office`/`industrial`/`other`) and `status` (`draft`/`active`/`under_offer`/`reserved`/`sold`/`rented`/`inactive`) are both different sets from the old mock ones (no `"condo"`; no `"available"`/`"off_market"`) — `formatPropertyType`/`formatPropertyStatus`/`getPropertyStatusBadgeClassName` are built against the real values, with a safe fallback (the raw string) for anything unmapped, matching `formatContactSource`'s approach.
- **No fabricated fields**: no images (the backend has none — the placeholder building icon block is now just that, a placeholder, not a broken image reference), no assigned agent, no "operation type" (sale vs. rent — `PropertyRead` has no such field). The card/detail page show only what's real: title, status, type, price, location (built from whichever of `neighborhood`/`city`/`state` are actually set), bedrooms/bathrooms/areas/parking (each guarded for `null`), description, features, and created date.
- **Property detail page** (`app/(dashboard)/properties/[id]/page.tsx`, new): same Client-Component-with-`use(params)` architecture as the lead detail page. No AI panels here — Lead Intelligence/Follow-up are contact-scoped agents, not property-scoped, and adding AI to this page was explicitly out of scope. `PropertyInterest`/the property's own activity timeline (`GET /properties/{id}/activities`) are real backend capabilities but deliberately not fetched here yet — this task was about making Properties itself real, not expanding what the detail page shows beyond that.
- **Security**: identical to Leads — only `property_id` (or nothing, for the list) ever leaves the frontend; organization scope is entirely backend-derived.

## Buyer search (real Buyer Requirements & Property Interests)

The "what is this client looking for?" workflow — rendered as a **Buyer search** section on the lead detail page (`app/(dashboard)/leads/[id]/page.tsx`). Covers both CRM cases from the backend's own data model:

- **Case A — `PropertyInterest`**: the contact is interested in one specific, already-identified property.
- **Case B — `BuyerRequirement`**: the contact is searching by criteria (budget, type, locations, …) — and the backend can compute deterministic candidate `Property` matches for it (`GET /buyer-requirements/{id}/matches`, Use Case 5, `app/services/matching_service.py` — no AI, plain SQL filtering; see also [Buyer Matching](#buyer-matching-real-property-recommendations) below for the richer, explainable analysis this UI actually calls today).

A contact can hold both, and can hold **several** `BuyerRequirement`s over time as their situation changes (e.g. rejecting one property, then opening a new search) — the backend never deletes an old one when a new one is created, it just gets a different `status`. This UI's central rule, taken directly from the task brief, is to **never hide that history**.

```
features/buyer-requirements/components/buyer-search-section.tsx (on the lead detail page)
  → lib/api/buyer-requirements.ts (getBuyerRequirementsForContact) → GET /api/v1/contacts/{id}/buyer-requirements
  → lib/api/property-interests.ts (getPropertyInterestsForContact) → GET /api/v1/contacts/{id}/property-interests

Per active requirement, on demand ("See property matches") — see Buyer Matching below:
  → lib/api/buyer-requirements.ts (getBuyerRequirementPropertyMatches) → GET /api/v1/buyer-requirements/{id}/property-matches
  → every active Property, classified + explained, rendered with the existing PropertyCard (features/properties/components/property-card.tsx)

Create / edit / cancel:
  → createBuyerRequirement → POST /api/v1/contacts/{id}/buyer-requirements
  → addBuyerRequirementLocation → POST /api/v1/buyer-requirements/{id}/locations
  → updateBuyerRequirement → PATCH /api/v1/buyer-requirements/{id}
```

- **`features/buyer-requirements/types.ts`**: `BuyerRequirement`/`BuyerRequirementLocation`/`BuyerRequirementFeature`/`PropertyInterest`/`PropertyMatch` mirror the backend's schemas field-for-field (same Decimal-as-string handling as `Property` — `budget_min`/`budget_max`/`bathrooms_min`/etc. are all `string | null`). Locations are the backend's real, normalized `BuyerRequirementLocation` rows (`GET`-returned as `locations: [...]`), never a single invented free-text field — `formatLocations()` joins them for display.
- **No match score, no percentage, ever**: `PropertyMatchRead` only ever gives `matched_preferred_features`/`total_preferred_features` — two real counts, nothing else. `MatchList` shows them as a plain "N of M preferred features matched" caption, and only when `total_preferred_features > 0` (an all-zero "0 of 0" reads as meaningless, not as "no match") — never converted into a percentage or any kind of score, per this task's explicit instruction. There is no AI involved in matching at all.
- **History is never hidden**: `BuyerSearchSection` fetches and renders *every* requirement the backend returns for a contact, split into an **Active search** group (`status === "active"`) and a **History** group (everything else — `paused`/`fulfilled`/`cancelled`) — confirmed against Sergio's real seeded data (an old `cancelled` requirement and a new `active` one, both returned by the same `GET` call and both rendered).
- **Create/edit reuses the backend's real fields only**: the form (`buyer-requirement-form.tsx`) surfaces the fields this task's own brief prioritizes — operation (`purpose`), property type, budget min/max, bedrooms/bathrooms/construction minimums, parking, locations (create only), notes — not the full `BuyerRequirementCreate`/`Update` schema (`timeline`/`financing_type`/`preapproval_status`/`motivation` are real backend fields but weren't part of the prioritized set asked for here). "Cancel search" is a plain `PATCH { status: "cancelled" }` on the same row — no new requirement is created for a simple status change, only for an actual "New search."
- **Locations and features are add-only, by design, not by omission**: the backend has no endpoint to remove or replace a `BuyerRequirementLocation`/`BuyerRequirementFeature`, only to add one (`POST .../locations`, `POST .../features`) — so the edit form doesn't attempt either; existing locations/features are still shown read-only on the card. A real `GET /features` catalog endpoint does exist (confirmed while building [Buyer Matching](#buyer-matching-real-property-recommendations)) and could power an assignment picker, but adding one here was out of scope for that task — deferred, not built, and no longer accurately described as "no endpoint exists."
- **Property → Buyer Requirement ("who's looking for something like this property?") is genuinely not implemented backend-side** — confirmed by inspecting `app/services/matching_service.py` and every property route; matching only runs one direction (requirement → candidate properties). Documented here as deferred, not built as a new, unasked-for backend relationship.
- **Loading/error/empty states**: "Loading buyer search…" while fetching, the same `FormError`/`getApiErrorMessage` pattern as everywhere else on failure, "No active property search yet." when a contact has neither a requirement nor a property interest, and "No properties currently match this search." when a real `GET .../matches` call returns an empty array — never a fallback to mock data.
- **Security**: identical pattern to Leads/Properties — only `contact_id`/`requirement_id` (whichever the current call needs) ever leaves the frontend; organization scope is entirely backend-derived, and a requirement outside the caller's organization 404s like every other resource.

## Buyer Matching (real property recommendations)

The first real matching system in this app — deterministic, explainable, no AI, no embeddings, no numeric score. Triggered from the same "See property matches" toggle on an active `BuyerRequirementCard` (on the lead detail page's Buyer search section) that used to show the older, narrower match list.

```
features/buyer-requirements/components/buyer-requirement-card.tsx ("See property matches")
  → features/buyer-requirements/components/property-match-list.tsx (fetches on toggle)
  → lib/api/buyer-requirements.ts (getBuyerRequirementPropertyMatches)
  → GET /api/v1/buyer-requirements/{id}/property-matches
  → every active Property in the organization, each with a classification
    (match / partial_match / no_match), the specific criteria it met and
    didn't, and a one-line summary
```

- **A separate, richer analysis — not a redesign of the existing matches UI**: `GET /buyer-requirements/{id}/matches` (`app/services/matching_service.py`'s original `find_matches`) already existed, with its own passing tests and its own frontend consumer (`match-list.tsx`, still present, still real, just no longer what this screen renders) that silently excludes any property that doesn't qualify. Replacing that endpoint's behavior would have broken both. Buyer Matching is a second, backend-side method (`analyze_matches`) on the same `MatchingService`, exposed at a new route, that evaluates **every** active property criterion-by-criterion instead of hard-filtering with one SQL `WHERE` — see the backend README's own "Buyer Matching" section for the full classification rule.
- **`features/buyer-requirements/types.ts`** gained `PropertyMatchAnalysis`/`MatchClassification` alongside the existing, untouched `PropertyMatch` (the older endpoint's shape) — same "add, don't replace" reasoning as the backend.
- **Match / Partial match / No match are visually distinct, color-coded badges** (emerald / amber / red, matching this app's existing status-badge conventions elsewhere — `PropertyStatusBadge`, Pipeline's `StageBadge`), not a numeric score rendered as a color. Each result also shows a green-checkmarked list of criteria it met and a red-X'd list of what it didn't — real, backend-generated sentences (e.g. "Price (4600000.00 MXN) is within budget.", "City is Monterrey, but the client is looking in: San Pedro Garza García."), never summarized into a percentage.
- **Reuses `PropertyCard` as-is** for each result (same visuals as the Properties page, same real link to `/properties/{id}`) — the classification badge and criteria breakdown render alongside it, not by duplicating property-rendering logic.
- **No fabricated criteria**: only the fields the backend actually evaluates appear — no postal code (a real `Property` field, but `BuyerRequirementLocation` has no matching field to compare it against, confirmed by reading the backend model directly), no invented weighting or partial credit.
- **Loading/error/empty states**: "Analyzing property matches…" while fetching, the same `FormError`/`getApiErrorMessage` pattern as everywhere else on failure, and "No properties to compare yet." when the organization has no active properties at all — never a fallback to mock data.
- **Security**: identical pattern to every other real page — only `requirementId` ever leaves the frontend; organization scope for both the requirement and every candidate property is entirely backend-derived, and a requirement outside the caller's organization 404s like every other resource.
- **Live-verified against the real Supabase demo data**: with the real backend and frontend running together, opening Alejandro Torres's buyer search and clicking "See property matches" correctly analyzed all 14 real seeded properties — one genuine `match` (every one of 8 specified criteria satisfied), most `partial_match` (with the exact unmet criteria shown, e.g. over budget, wrong city), and two real `no_match` results — then clicking through the top match navigated to its real property detail page. Zero console errors. This feature makes no writes at all (a pure `GET`), so no cleanup was needed. Leads, Properties, Pipeline (board and detail), Tasks, Appointments, AI Assistant, and the Lead Intelligence/Follow-up panels were all spot-checked live afterward and showed no regressions.

## Pipeline (real CRM opportunities)

The Pipeline board and opportunity detail page are wired to the backend's real Opportunities API (`app/api/routes/opportunities.py`) — `features/pipeline/mock-data.ts`'s `mockDeals` is no longer the source of truth for either page (it's still used by the Dashboard's pipeline summary widget, deliberately untouched — see below).

```
Pipeline page (/pipeline) → features/pipeline/components/pipeline-board.tsx (fetches on mount)
  → lib/api/pipeline.ts (getOpportunities) → GET /api/v1/opportunities
  → lib/api/contacts.ts (getContacts) / lib/api/properties.ts (getProperties) → name lookups, joined client-side by id

Opportunity detail page (/pipeline/[id]) → getOpportunity(id) → GET /api/v1/opportunities/{id}
  → real opportunity, or a 404 if it doesn't exist / belongs to another organization
  → then, in parallel: getContact(contact_id), getProperty(property_id)/getBuyerRequirement(buyer_requirement_id)
    (only if referenced), getOpportunityActivities(id), getTasksForOpportunity(id), getAppointmentsForOpportunity(id)

Stage change → features/pipeline/components/stage-selector.tsx
  → lib/api/pipeline.ts (updateOpportunityStage) → PATCH /api/v1/opportunities/{id}
```

- **`features/pipeline/types.ts`** gained `Opportunity`/`Activity`/`OpportunityTask`/`OpportunityAppointment` (mirroring `OpportunityRead`/`ActivityRead`/`TaskRead`/`AppointmentRead` field-for-field) alongside the existing, untouched `Deal`/`PipelineStage`. Not consolidated, for the exact reason `features/leads/types.ts` already documents for `Lead` vs `Contact`: `Deal` (a single flattened `value`/`probability`/`agentName`) has no real equivalent — a `Contact` can have *several* real `Opportunity` rows — and `Deal`/`PipelineStage` are still load-bearing for the Dashboard's pipeline summary widget and the Leads table's mock "status" column, both explicitly out of scope here. `StageBadge`/`PipelineBoard`/`PipelineColumn` themselves *were* fully replaced (not left duplicated) — nothing outside `app/(dashboard)/pipeline/page.tsx` imported them, confirmed before changing them.
- **`expected_value` is a Decimal-as-string, `probability` is a real number**: confirmed against `app/models/opportunity.py`, not assumed from `Property.price`'s precedent — `expected_value` is a `Numeric(14,2)` (JSON string, e.g. `"3200000.00"`), but `probability` is a plain `SmallInteger` (0-100), so it's typed `number | null` and rendered directly, no `Number(...)` parse needed.
- **Columns are built from whichever stages are actually present**, in the backend's own canonical order (`OPPORTUNITY_STAGE_VALUES`) — never a fixed 13-column board, most of which would be empty for any one organization. Confirmed against live demo data: the real board renders 9 columns (Qualification/Search/Listing/Property selected/Showing/Offer/Negotiation/Won/Lost), not 13 — Marketing/Reservation/Contract/Closing simply have no seeded opportunity in them right now.
- **No drag-and-drop** — a deliberate choice per this task's own brief. A stage change is a real, auditable CRM action (the backend writes a `stage_change` Activity and a named audit action on every one — see `app/services/opportunity_service.py`), so it goes through an explicit "Save" (`stage-selector.tsx`), not an implicit drop. Picking "Lost" reveals a required second reason picker, matching the backend's own `lost_reason`-required-when-lost validation — this is collected client-side before the PATCH is ever sent, rather than surfacing the backend's 422 after the fact.
- **"Overdue"/"Upcoming" are computed client-side, not stored fields**: `isTaskOverdue`/`isAppointmentUpcoming` (`features/pipeline/types.ts`) compare `due_at`/`start_at` against `Date.now()` — the backend has neither an `is_overdue` nor an `is_upcoming` column, matching this app's "never fabricate a field the backend doesn't return" rule throughout; these are plain client-side facts about the already-real data, not a new backend concept.
- **Owner shows "You" or "Another team member", never a fabricated name**: there is no `GET /users` (or similar) endpoint backend-side — only the caller's own identity is ever exposed (`GET /me`) — so an opportunity's `owner_user_id` can only be resolved against the *signed-in* user's own id (via the existing `useUser()` hook, which already carries the real Supabase `user.id` — no second `/me` call needed). Any other owner is shown as "Another team member," not a raw UUID and not an invented name.
- **Buyer requirement links to the contact's lead page, not a dedicated page**: there is no `/buyer-requirements/[id]` route in this app — a `BuyerRequirement` is only ever displayed on the lead detail page's Buyer search section (see [Buyer search](#buyer-search-real-buyer-requirements--property-interests)) — so "navigate to the related buyer requirement" resolves there, which is also where a person would actually act on it (edit/cancel/see matches). `lib/api/buyer-requirements.ts` gained one small addition, `getBuyerRequirement(id)` (`GET /buyer-requirements/{id}`), to fetch the single requirement an opportunity references.
- **Stage history is the opportunity's own Activities, not `GET /audit-logs`**: both were inspected; `GET /opportunities/{id}/activities` is already scoped to the one opportunity and — per the backend's own docstring — is the intended home for this ("The historical timeline lives in Activities, not duplicated inside Opportunity itself"), whereas audit logs cover every entity type organization-wide and would need an extra `entity_type`/`entity_id` filter to narrow down to the same thing.
- **Loading/error/empty states**: the same shape as every other real page in this app — a centered spinner while fetching, the shared `FormError`/`getApiErrorMessage` banner on failure, and a genuine empty state ("No opportunities yet") when the organization has none. On the detail page, a *secondary* fetch failing (e.g. the property lookup) doesn't fail the whole page — only the primary opportunity fetch failing does; whatever else loaded successfully still renders.
- **Security**: identical pattern to every other real page — only `opportunity_id` (or `contact_id`/`property_id`/`buyer_requirement_id`, each already known from the loaded opportunity) ever leaves the frontend, never an `organization_id`; the backend alone determines organization scope from the verified bearer token, and an opportunity outside it 404s like every other resource.
- **Live-verified against the real Supabase demo data**, not just the offline test suite: with the real backend (`uvicorn`) and real frontend (`next dev`) running together against the actual demo organization, the Pipeline board correctly rendered 11 real seeded opportunities across 9 real stage columns, and Carlos Mendoza's opportunity detail page correctly showed his real overdue task (flagged "Overdue", computed client-side), his real buyer requirement's budget range, his real stage-change activity history, and "You" as owner (the signed-in demo user is that opportunity's real `owner_user_id`) — with zero console/page errors. The stage selector was opened live and confirmed to offer the correct buy-type stages for a real opportunity; an actual PATCH was deliberately not submitted during this live pass, to avoid writing a permanent stage-change/audit record into the shared demo data purely for a manual check — the PATCH payload, `lost_reason` handling, and error paths are already exercised by the automated test suite (mocked responses) instead.

## Appointments (real CRM data)

The Appointments list page is wired to the backend's real Appointments API (`app/api/routes/appointments.py`) — `features/appointments/mock-data.ts`'s `mockAppointments` is no longer the source of truth for it (it's still used by the Dashboard's own appointment widgets, deliberately untouched — see below).

```
Appointments page (/appointments) → features/appointments/components/appointments-list.tsx (fetches on mount)
  → lib/api/appointments.ts (getAppointments) → GET /api/v1/appointments
  → lib/api/contacts.ts (getContacts) / lib/api/properties.ts (getProperties) / lib/api/pipeline.ts (getOpportunities)
    → name lookups for the contact/property/opportunity each appointment references, joined client-side by id
```

- **`features/appointments/types.ts`** gained `AppointmentRecord` (mirroring `AppointmentRead` field-for-field) alongside the existing, untouched mock `Appointment`/`AppointmentType`/`AppointmentStatus`. Not consolidated, for the exact reason `features/leads/types.ts` already documents for `Lead` vs `Contact`, and `features/pipeline/types.ts` for `Deal` vs `Opportunity`: the mock shape (`date`/`time`/`durationMinutes`/`leadName`/`agentName`) has no real equivalent, and — unlike `features/properties/mock-data.ts`'s old `Property` — the mock `Appointment` **type itself** (not just the mock array) is imported by name from three Dashboard files (`app/(dashboard)/dashboard/page.tsx`, `features/dashboard/components/{priorities-list,upcoming-appointments-list}.tsx`), so it couldn't be freed up the same way `Property` was without also touching the Dashboard — confirmed by grep before touching anything, same discipline as the Pipeline task. `AppointmentStatusBadge`/`AppointmentsList` themselves *were* fully replaced (not left duplicated): confirmed via a precise word-boundary search that nothing outside `app/(dashboard)/appointments/page.tsx` imported either (the Dashboard uses its own separate `UpcomingAppointmentsList` component, which still takes the mock `Appointment[]` and was left untouched).
- **A confirmed, not assumed, enum overlap — and a confirmed non-overlap**: `status` happens to share the same five real values as the mock `AppointmentStatus` (scheduled/confirmed/completed/cancelled/no_show) — checked against `app/schemas/enums.py`, not assumed from the mock's own spelling. `appointment_type` does **not**: the real values are `showing/call/meeting/notary/signing/other`, not the mock's `viewing/call/meeting/closing/other` — reusing the mock's `APPOINTMENT_TYPE_LABELS` for real data would have silently rendered "undefined" for `showing`/`notary`/`signing`. Both `status` and `appointment_type` are typed as plain `string` on `AppointmentRecord` (matching the backend's own unvalidated read schema), with their own fallback-safe `formatAppointmentStatus`/`formatAppointmentType` helpers.
- **Accepted, documented duplication with Pipeline**: `features/pipeline/types.ts` already defines its own `OpportunityAppointment` (identical shape — it needed the appointments shown on one opportunity's detail page before this feature existed). This task did not retroactively refactor Pipeline's already-shipped, already-tested files to import `AppointmentRecord` from here instead — judged out of scope for a task specifically about the Appointments page, not a Pipeline cleanup. Documented in both files as a known, intentional tradeoff, not an oversight.
- **No fabricated pagination or server-side search/sort**: the backend has no text-search endpoint and exactly one fixed order (`start_at` ascending, `app/repositories/appointment_repo.py` — no sort parameter exists to request anything else), so this page fetches the full list once (capped at the backend's 200-per-request limit, same as every other list endpoint in this app) and does search + status filtering entirely client-side — same pattern `PropertiesGrid`/`PipelineBoard` already established, not a new one invented here. The status filter's options are derived from whichever statuses are actually present in the loaded data, never a hardcoded full enum list.
- **Day-grouping ported from the old mock UI**, now driven by real `start_at` timestamps (grouped by real calendar day, not a synthetic `date` field) — the backend already returns appointments in ascending `start_at` order, so grouping a client-side-filtered slice of that list preserves correct chronological order without any extra sorting. **`lib/format.ts` gained `formatTime()`** (e.g. "10:30 AM" from a full ISO timestamp) alongside the existing `formatTimestamp()`, for the time-of-day shown next to each row — same plain `new Date(iso)` reasoning, not the bare-`"YYYY-MM-DD"`-only `formatShortDate`/`formatRelativeToToday`.
- **Assignee shows "You" or "Another team member", never a fabricated name** — same reasoning as Pipeline's opportunity owner: no `/users` endpoint exists backend-side, so `assigned_to_user_id` can only ever be resolved against the signed-in user's own id (via `useUser()`). A small, local `getAssigneeLabel` duplicates Pipeline's `getOwnerLabel` rather than sharing it — same accepted-duplication tradeoff as `AppointmentRecord` above, kept consistent rather than partially refactoring one and not the other.
- **Contact/property/opportunity are resolved through existing APIs only**: `getContacts()`/`getProperties()`/`getOpportunities()` (already real, already used by Leads/Properties/Pipeline) — no new backend endpoint was added or needed. Each appointment's `contact_id`/`property_id`/`opportunity_id` links to that entity's real detail page (`/leads/{id}`, `/properties/{id}`, `/pipeline/{id}`) when present.
- **Loading/error/empty states**: the same shape as every other real page in this app — a centered spinner while fetching, the shared `FormError`/`getApiErrorMessage` banner on failure, and a genuine empty state ("No appointments scheduled") when the organization has none, plus a separate "no appointments match your filters" state when a search/status filter narrows a non-empty list to zero. A *secondary* fetch failing (contact/property/opportunity name lookups) doesn't fail the whole page — appointments still render with a plain fallback label per row.
- **No create/edit/cancel flow**: `POST`/`PATCH`/`DELETE /appointments/{id}` all exist backend-side, but the "Schedule appointment" button stays disabled, matching this task's own scope (list integration only, same restraint `lib/api/properties.ts` already documents for itself) — see [What remains to be implemented](#what-remains-to-be-implemented).
- **Security**: identical pattern to every other real page — only `contact_id`/`property_id`/`opportunity_id` (each already known from the loaded appointment) ever leave the frontend, never an `organization_id`; the backend alone determines organization scope from the verified bearer token.
- **Live-verified against the real Supabase demo data**: with the real backend (`uvicorn`) and real frontend (`next dev`) running together, the Appointments page correctly rendered the one real seeded appointment (Natalia Ramírez's "Segunda visita — Casa Carretera Nacional"), grouped under its real day heading, with working links to her real contact, the real property, and the real opportunity, "You" correctly resolved as the real signed-in owner, and the real status filter widget opening with the correct real options ("All statuses", "Confirmed") — with zero console errors. The search box was exercised live too (typing "segunda" kept the appointment visible; an unrelated search correctly showed the "no matches" empty state) — both client-side only, no backend write involved.
- **A real, reproducible jsdom-only test bug found and fixed while writing these tests**: `tests/test-utils/select-stub.tsx` (built during the Pipeline task, reused here for the status filter) originally registered its `<option>`s via a child component's `useEffect`, which left a real timing gap between first render (no options yet) and the effect flushing (options registered) — `fireEvent.change`-ing a native `<select>` before its target `<option>` exists silently no-ops instead of erroring, so a status-filter test could pass the value through as empty. It only surfaced as an intermittent failure when the *whole* suite ran together (more scheduling variance), never when the file ran alone — found by deliberately re-running the full suite multiple times in a row, not just once. Fixed by extracting `<SelectItem>`s synchronously during render instead of via a post-commit effect, removing the race entirely; reconfirmed stable across several consecutive full-suite runs afterward.

## Tasks (real CRM data)

Unlike every other real page in this app, Tasks had **no pre-existing frontend at all** to replace — confirmed before writing any code: no `features/tasks/` directory, no mock data, no `/tasks` route, no nav entry. This section documents a page built from scratch against the backend's real, already-implemented Tasks API (`app/api/routes/tasks.py`), not a mock-to-real conversion like Appointments/Pipeline.

```
Tasks page (/tasks, new) → features/tasks/components/task-list.tsx (fetches on mount)
  → lib/api/tasks.ts (getTasks) → GET /api/v1/tasks
  → lib/api/contacts.ts (getContacts) / lib/api/properties.ts (getProperties) / lib/api/pipeline.ts (getOpportunities)
    → name lookups for the contact/property/opportunity each task references, joined client-side by id
  → lib/api/buyer-requirements.ts (getBuyerRequirement), once per unique buyer_requirement_id actually
    referenced by a loaded task — there's no bulk/list-all endpoint for these, only per-contact or per-id
```

- **New, not a rename**: `features/tasks/types.ts`'s `Task` gets the clean, natural name directly — there was no mock `Task` type anywhere else in this app to collide with or free up (confirmed by search), unlike `Opportunity`/`AppointmentRecord`, which both had to pick a different name from an existing, still-load-bearing mock type of the same conceptual entity.
- **Accepted, documented duplication with Pipeline**: `features/pipeline/types.ts` already defines its own `OpportunityTask` (identical shape, for the tasks shown on one opportunity's detail page) with its own `formatTaskStatus`/`formatTaskPriority`/`isTaskOverdue`. Same tradeoff already made for `AppointmentRecord` vs `OpportunityAppointment` — not retroactively refactored, kept consistent rather than de-duplicating one pair and not the other.
- **No fabricated Appointment link**: the task brief that specified this page's requirements asked for linking Contact/Opportunity/Property/**Appointment** — but `TaskRead` (`app/schemas/task.py`) has no `appointment_id` field at all, confirmed directly against the schema, not assumed. A task can reference a contact, property, buyer requirement, property interest, or opportunity — never an appointment. This page links the four real, present fields (contact, property, opportunity, buyer requirement) and simply has no Appointment link, rather than inventing one.
- **Buyer requirement, resolved and linked like Pipeline's detail page**: `buyer_requirement_id` is a real `TaskRead` field; each unique one actually referenced by a loaded task is fetched via the existing `getBuyerRequirement(id)` (added during the Pipeline task) and linked to the contact's lead page — there's no dedicated buyer-requirement page, same reasoning already documented in [Pipeline (real CRM opportunities)](#pipeline-real-crm-opportunities).
- **No fabricated pagination or server-side search/sort**: the backend has no text-search endpoint and exactly one fixed order (`due_at` ascending, `app/repositories/task_repo.py` — no sort parameter exists), so this page fetches the full list once (capped at the backend's 200-per-request limit) and does search + status + priority filtering entirely client-side, matching Properties/Pipeline/Appointments. Status/priority filter options are derived from whichever values are actually present in the loaded data.
- **Overdue is computed client-side from real timestamps against the actual current time** (`isTaskOverdue`, `features/tasks/types.ts`) — `task.status` not `completed`/`cancelled` and `due_at` already in the past, evaluated via `Date.now()` when the page renders, never a hardcoded "today" or a stored backend field. Confirmed live against the real seeded task (due two days before the demo data's reference date), which the real page correctly flags "Overdue" in red.
- **Day-grouping by real `due_at`**, same pattern as Appointments' day-grouping by `start_at` — the day is the group heading; the per-row time (`formatTime`) shows the specific due time without repeating the date already shown above it.
- **Assignee shows "You" or "Another team member", never a fabricated name** — same reasoning as Pipeline's opportunity owner and Appointments' assignee: no `/users` endpoint exists, so `assigned_to_user_id` can only be resolved against the signed-in user's own id. A local `getAssigneeLabel` duplicates the other two — same accepted-duplication tradeoff, kept consistent.
- **Navigation wiring this page needed that Appointments/Pipeline didn't**: since no Tasks page existed before, this task also added `/tasks` to `components/navigation/nav-config.ts` (`NAV_ITEMS` + a new `"tasks"` `NavIconName`, resolved to `ListTodo` in `components/navigation/nav-link.tsx`) and to `lib/supabase/proxy.ts`'s `PROTECTED_PREFIXES` — without the latter, `/tasks` would have been reachable while signed out, unlike every other real page in this app.
- **Loading/error/empty/no-results states**: identical shape to every other real page — spinner while fetching, the shared `FormError`/`getApiErrorMessage` banner on failure, a genuine "No tasks yet" empty state, and a distinct "No tasks match your filters" state when a search/status/priority filter narrows a non-empty list to zero.
- **No create/edit/complete flow**: `POST`/`PATCH`/`DELETE /tasks/{id}` all exist backend-side, but "New task" stays disabled — this task's scope was the list integration only, same restraint already documented for Properties/Appointments.
- **Security**: identical pattern to every other real page — only `contact_id`/`property_id`/`opportunity_id`/`buyer_requirement_id` (each already known from the loaded task) ever leave the frontend, never `organization_id`; the backend alone determines organization scope from the verified bearer token.
- **Live-verified against the real Supabase demo data**: with the real backend and real frontend running together, clicking the new "Tasks" nav link (not just navigating directly) correctly reached `/tasks` and rendered the one real seeded task (Carlos Mendoza's overdue follow-up), grouped under its real day heading, correctly flagged "Overdue," with working links to his real contact, his real opportunity, and his real buyer requirement (two links resolving to the same contact page, since both fields reference the same contact here — confirmed, not assumed), "You" correctly resolved as the real assignee, and both the real status and priority filter widgets opening with their correct real options ("Pending"/"High," the only values present) — zero console errors. The other real pages (Leads, Properties, Pipeline, Appointments, AI Assistant) were also spot-checked live after this change and showed no regressions.

## Create/edit flows

Real `POST`/`PATCH` forms for the five core operational entities — Contacts, Properties, Opportunities, Tasks, Appointments — replacing every previously-disabled "Add …" button in this app. Each is one dialog component reused for both creating and editing (`ContactForm`, `PropertyForm`, `OpportunityForm`, `TaskForm`, `AppointmentForm`, one per feature folder), following the exact same shape `BuyerRequirementForm` already established: an `isEdit = Boolean(existingEntity)` branch, a `FormError` banner, a submitting spinner on the submit button, and a real `POST`/`PATCH` call through `apiRequest`.

```
"Add lead" (app/(dashboard)/leads/page.tsx) → ContactForm (create mode)
  → lib/api/contacts.ts (createContact) → POST /api/v1/contacts
  → redirect to /leads/{new id}

Lead detail page "Edit" → ContactForm (edit mode)
  → updateContact → PATCH /api/v1/contacts/{id} → onSaved updates local state, no redirect

(Properties and Opportunities follow the identical create-redirects /
edit-updates-local-state shape — Properties via PropertyForm +
lib/api/properties.ts, Opportunities via OpportunityForm +
lib/api/pipeline.ts, redirecting to /pipeline/{new id} on create.)

Tasks/Appointments (no detail page in this app) → TaskForm/AppointmentForm
  → createTask/createAppointment → POST /api/v1/tasks or /appointments
  → the page bumps a `refreshKey`, remounting (and re-fetching) the list
    below it, since there's nowhere else to redirect to

  Per-row "Edit" icon in the list → TaskForm/AppointmentForm (edit mode)
  → updateTask/updateAppointment → PATCH .../{id} → onSaved replaces just
    that one row in the list's own state
```

- **Every field mirrors the real backend schema, confirmed by re-reading each one directly before writing its form** (not assumed from an earlier report) — `app/schemas/{contact,property,opportunity,task,appointment}.py`'s Create/Update classes. Each feature's `types.ts` gained one `XInput` interface (all-optional, same convention `BuyerRequirementInput` already established) mirroring that schema exactly — Decimal fields (`price`, `expected_value`, …) are sent as plain JS numbers, not the Decimal-as-string shape the *inbound* read types use (Pydantic parses a JSON number into a Decimal on the way in fine; the string encoding is specifically how the backend serializes one back *out*).
- **No invented fields, anywhere**: no lead score/status, no property feature picker (deferred — see [What remains to be implemented](#what-remains-to-be-implemented)), no `appointment_id` on Task (`TaskRead` genuinely has none — confirmed against the schema, not assumed from the task brief that asked for one), no `organization_id` in any payload (every `XInput` type structurally has no such field, so there's nothing to accidentally send).
- **No `/users` endpoint, so no assignee/owner picker, anywhere**: `Task.assigned_to_user_id` (required by `TaskCreate`) and `Appointment.assigned_to_user_id`/`Opportunity.owner_user_id` (both optional) are all silently defaulted to the signed-in user (via `useUser()`) on create, and never shown as a field to edit — the only identity any of these forms can safely offer is "you," same "You"/"Another team member" convention already established for read-only display (Pipeline's `getOwnerLabel`, Appointments/Tasks' `getAssigneeLabel` — each form has its own small copy of this default, the same accepted, documented duplication already established elsewhere in this app rather than inventing a shared identity module for it).
- **Opportunity respects every stage/type rule the backend enforces, client-side, as a UX convenience — the backend re-validates all of it regardless**: `opportunity_type` and `contact_id` are only shown (and only ever sent) on create — `OpportunityUpdate` has neither field, matching that schema's own docstring ("if the type is wrong, create a new Opportunity"). Stage options are always scoped to the selected/existing `opportunity_type` via the existing `OPPORTUNITY_STAGES_BY_TYPE`; changing the type after picking an incompatible stage resets it to `"qualification"`. **Stage itself is only editable through the existing `StageSelector`**, not this form — `OpportunityForm`'s edit mode deliberately omits `stage`/`lost_reason` entirely, so the one place that collects a lost-reason before marking a deal lost, and the one write path that's been live-verified to produce the backend's `stage_change` Activity/audit record, stays exactly one path, not two competing ones. Buyer requirement options are re-fetched (via the existing `getBuyerRequirementsForContact`) whenever the relevant contact changes — required because the backend 422s a buyer requirement that doesn't belong to the opportunity's own contact.
- **Task/Appointment `status` is edit-only**: a new Task always starts `"pending"` and a new Appointment always starts `"scheduled"` (each schema's own server-side default), so there's nothing meaningful to pick at creation time — both forms only show a status picker once `task`/`appointment` (i.e. edit mode) is passed in.
- **Client-side validation is a UX nudge, not the source of truth**: required-field `*` markers and native `required` attributes catch empty submissions before a network round-trip; Contact's "email or phone" rule and Appointment's "end after start" rule are re-checked client-side too (both disable/reject submission early) — but every one of these is enforced server-side regardless (`ContactBase`'s validator, `AppointmentBase`'s `model_validator`), so a client-side bug here would fail loudly as a 422, never silently corrupt data.
- **Duplicate-submission guard**: every form tracks its own `isSubmitting` state and ignores a second submit while a request is in flight — the submit button also visibly disables and shows a spinner, so there's both a functional guard and a visual one.
- **Roles (Contact only)**: `ContactCreate`/`ContactUpdate` have no `roles` field at all — a role is assigned/removed one at a time via `POST`/`DELETE /contacts/{id}/roles`. `ContactForm` still lets the user toggle roles as chips (the real, complete six-value set, `CONTACT_ROLE_KEYS`) in one form: on create, each selected role is assigned right after the contact itself is created (same "create, then attach sub-resources" pattern `BuyerRequirementForm` already uses for locations); on edit, the newly-toggled set is diffed against the contact's existing roles and only the actual additions/removals are sent, never a full replace.
- **Security**: identical pattern to every real page in this app — the frontend only ever sends the fields each `XInput` type structurally allows (no `organization_id` field exists to send), `apiRequest` attaches the bearer token, and the backend alone determines organization scope and re-validates every relationship id (a cross-org `contact_id`/`property_id`/etc. 404s or 422s server-side, same as it always has — nothing about these new write paths changes that).
- **Live-verified against the real Supabase demo data, with real records cleaned up afterward**: with the real backend and frontend running together, every create flow was exercised through the actual UI (clicking the real buttons, filling the real dialogs) — Contact and Property both redirected to their new real detail pages with the right data, Tasks and Appointments both appeared in their real lists after creation, and every edit flow (including marking a Task/Appointment `"completed"`) was confirmed against the **real backend response** (the UI's own post-save DOM check raced ahead of a couple of real network round-trips and under-reported two of them as "not yet visible" — the actual data was verified correct directly via the backend API immediately after, catching that the check itself, not the app, was too eager). The one seeded Opportunity used for a live edit check was reverted to its exact original title afterward and confirmed unchanged via the backend API — no permanent Opportunity was created live at all, since `Opportunity` has no `DELETE` endpoint (by design — see app/services/opportunity_service.py's own docstring) and this task's own instructions were explicit about never leaving unwanted demo records behind. Every other real record created during this verification (one Contact, one Property, two Tasks, one Appointment) was deleted afterward via the same authorized `DELETE` endpoints the backend already exposes, and a final sweep of all five list endpoints confirmed zero test records remain anywhere.

## Supabase configuration

You'll need a free Supabase project. None of this involves the FastAPI backend — Supabase is used directly as the auth provider for now.

1. **Create a project** at [supabase.com/dashboard](https://supabase.com/dashboard) → New Project. Pick any name/region/password (the DB password isn't used by this frontend at all).
2. **Project URL**: Project Settings → API → "Project URL". This is `NEXT_PUBLIC_SUPABASE_URL`.
3. **Browser-safe key**: same page, under API Keys — copy the **publishable key** (Supabase's current name for it; older projects/docs call the same kind of key the **anon key** — either works, see the naming note in `.env.example`). This is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. **Never** copy the `service_role` key into this project — that key bypasses all access control and must only ever live in a backend environment.
4. **Enable email auth**: Authentication → Providers → Email should already be on by default. Optionally, under Authentication → Settings, decide whether "Confirm email" is required (on by default — sign-up shows a "check your email" state either way, so this just changes whether that step is real).
5. **Configure Google OAuth**: Authentication → Providers → Google → toggle it on. You'll need a Client ID and Client Secret from Google Cloud Console (next step) — paste them here, and copy the **Callback URL (for OAuth)** Supabase shows on this page; you'll need it in step 8.
6. **Google Cloud Console credentials**: [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create Credentials → OAuth client ID → Application type **Web application**.
7. **Authorized JavaScript origins** (on that Google OAuth client): add `http://localhost:3000` for local dev, plus your production URL once you have one (e.g. `https://your-app.vercel.app`).
8. **Authorized redirect URIs** (same Google OAuth client): add the **Supabase callback URL** from step 5 — it looks like `https://<your-project-ref>.supabase.co/auth/v1/callback`. This is a Supabase URL, not this app's `/auth/callback` route — Supabase itself receives Google's redirect first, then forwards the browser to this app's callback.
9. **Supabase redirect URL allow-list**: Authentication → URL Configuration → "Redirect URLs" — add `http://localhost:3000/auth/callback` for local dev, and `https://your-production-domain.com/auth/callback` once deployed. `signInWithOAuth` in this app requests exactly that path (`window.location.origin + "/auth/callback"`), and Supabase will refuse to redirect anywhere not on this list.
10. **Local development URL**: `http://localhost:3000` (also set as Authentication → URL Configuration → "Site URL" for local work).
11. **Production URL placeholder**: replace every `localhost:3000` above with your real deployed URL once you have one — Google origins/redirect URIs, Supabase redirect URLs, and Supabase's "Site URL" all need the production domain added (in addition to, not instead of, the local ones, if you want both to keep working).

Local `.env.local` (copy from `.env.example`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

Never commit real values for these — `.env.local` is gitignored; only `.env.example` (with placeholders) is tracked.

## Architectural decisions

- **Dark theme by default.** The product direction is a near-black, purple-tinted "AI-first SaaS" look (see `app/globals.css`), applied via an unconditional `dark` class in `app/layout.tsx`. The light theme tokens are still fully defined in `:root`, so adding a theme toggle later is a small change, not a rewrite.
- **shadcn/ui on Base UI, not Radix.** As of the version installed here, shadcn's default primitive library is [Base UI](https://base-ui.com) rather than Radix. The biggest practical difference: composing a custom element (e.g. rendering a menu item as a `<Link>`) uses Base UI's `render` prop instead of Radix's `asChild`.
- **Pipeline stage was one shared mock vocabulary — now two separate real/mock ones.** A lead's mock "status" and a mock deal's "stage" still share the same `PipelineStage` type (`features/pipeline/types.ts`), reused by the Leads table's status filter and the Dashboard's pipeline summary. The real Pipeline board/detail page use a different, real `OpportunityStage` (the backend's actual 13-value enum) in the same file — deliberately not unified with `PipelineStage`, since a real Opportunity's stage and a mock Lead's status are different concepts with different value sets (see [Pipeline (real CRM opportunities)](#pipeline-real-crm-opportunities)).
- **`lib/utils.ts` stays reserved for shadcn's `cn` helper** (every generated `components/ui/*` file imports `@/lib/utils` by convention). Other formatting helpers live in `lib/format.ts` instead of a `lib/utils/` folder, to avoid a same-name file/folder ambiguity.
- **Icons in nav config are names, not components.** `components/navigation/nav-config.ts` is read by a Server Component and passed into a Client Component (`NavLink`); a Lucide icon is a `forwardRef` component, and passing one directly across that boundary fails at build time. Icons are stored as string names and resolved locally inside the Client Component instead — the same pattern used for AI agent icons (`features/ai/types.ts`).
- **Multi-tenancy isn't implemented, but isn't blocked either.** `types/user.ts` models `Organization → Team → User` so backend-driven multi-tenancy doesn't require a frontend rewrite later.
- **No schema validation library for auth forms.** `features/auth/validation.ts` is hand-rolled (email regex, password length/character checks, confirm-match) rather than pulling in Zod for five form fields — Supabase re-validates everything server-side regardless, so this is a UX layer only.
- **`useUser()` never redirects.** It's a display-only hook (`hooks/useUser.ts`); all access control happens in `proxy.ts`, which runs before any page renders. Mixing redirect logic into a hook that also drives UI (the user menu) risks fighting the proxy redirect or flashing protected content.

## Security notes

- No secrets live in this repo. `.env.example` documents the only environment variables the frontend uses — `NEXT_PUBLIC_API_URL` and the two Supabase ones — and none of them are secret: anything prefixed `NEXT_PUBLIC_` is bundled into client-side JS, and the Supabase publishable/anon key is specifically designed to be public (it only ever grants what your Row Level Security policies allow).
- The Supabase `service_role` key is never referenced anywhere in this codebase, and must never be added here — it bypasses all access control and belongs only in a backend environment (the future FastAPI service), never in `NEXT_PUBLIC_*` or any frontend code path.
- There is no OpenAI/Anthropic/Ollama key or connection anywhere in this codebase either — the frontend talks only to the FastAPI backend (`NEXT_PUBLIC_API_URL`), never directly to an LLM provider; the backend alone owns that integration.
- The two real AI calls (`lib/api/ai.ts`) and the real contacts calls (`lib/api/contacts.ts`) send only `contact_id` (or no id, for the contacts list) — never `organization_id` — as the frontend has no way to know or assert the caller's organization; that's derived entirely server-side from the verified bearer token. See [AI agent integration](#ai-agent-integration) and [Leads (real CRM contacts)](#leads-real-crm-contacts).
- Sessions live in cookies via `@supabase/ssr` — never `localStorage`, and there is no hand-rolled JWT handling to audit. `lib/api/client.ts` reads the same session (via `getSession()`) to attach the bearer token sent to the backend — it doesn't create or store a separate token anywhere.
- `proxy.ts` is an optimistic, UX-level check (see [How protected routes work](#how-protected-routes-work)) — it is **not** the final security boundary. The FastAPI backend must independently verify every request's Supabase JWT once it exists; nothing here should be trusted as authorization by itself.

## What remains to be implemented

- A create/edit/cancel flow for Appointments and Tasks — `POST`/`PATCH`/`DELETE` all exist backend-side for both, but "Schedule appointment"/"New task" stay disabled; both tasks' scope was list integration only (see [Appointments (real CRM data)](#appointments-real-crm-data), [Tasks (real CRM data)](#tasks-real-crm-data))
- Wiring the Dashboard's pipeline summary / "today's priorities" / hot leads / upcoming appointments to the real Opportunities/Contacts/Appointments data now that all three exist (`features/dashboard/lib.ts` still derives everything from `features/pipeline/mock-data.ts`'s `mockDeals`, `features/leads/mock-data.ts`, and `features/appointments/mock-data.ts`) — deliberately not done as part of making Pipeline/Appointments themselves real, since the Dashboard is a distinct aggregation-across-many-records problem (which opportunities/leads/appointments count as "hot," "priority," or "upcoming") neither task's brief asked for
- A real `/pipeline/[id]` create flow, and a create flow for Tasks generally — Pipeline's task only wired up viewing an opportunity and changing its stage, matching its own brief; `POST /contacts/{id}/opportunities` exists backend-side but has no frontend form yet
- De-duplicating `features/pipeline/types.ts`'s `OpportunityAppointment`/`OpportunityTask` in favor of importing `AppointmentRecord`/`Task` from `features/appointments/types.ts`/`features/tasks/types.ts` now that both have a more natural, general home — small, low-risk cleanups deliberately deferred rather than done as a side effect of either task (see each section's own note on the tradeoff)
- Wiring the Dashboard's own task-shaped "priorities" widget (currently derived from `Lead.followUpDate`, a mock-only field — see `features/dashboard/lib.ts`'s `getDueFollowUps`) to the now-real Tasks data instead — deliberately not done as part of this task, since the Dashboard is explicitly out of scope
- A feature picker on the Property create/edit form — `GET /features` (the catalog) exists backend-side and could power one, same as the still-deferred one noted above for Buyer Requirements, but assigning/removing property features was judged out of scope for the create/edit flows task (see [Create/edit flows](#createedit-flows)); existing features are still shown read-only on the property detail page
- A way to reassign a Task/Appointment/Opportunity to someone other than yourself, or to see who besides you it's assigned to by name — there is still no `/users` endpoint; every create/edit form defaults `assigned_to_user_id`/`owner_user_id` to the signed-in user and never offers a picker (see [Create/edit flows](#createedit-flows))
- Real pagination for the Leads/Properties lists once an organization's record count could exceed the backend's 200-per-request cap (both `getContacts()`/`getProperties()` currently fetch up to 200 in one call, fine for the 20-contact/14-property demo org)
- Surfacing `PropertyInterest`/a property's own activity timeline (`GET /properties/{id}/activities`) on the property detail page — real backend capabilities, deliberately not wired up yet (see [Properties (real CRM listings)](#properties-real-crm-listings))
- Property → Buyer Requirement ("who's looking for something like this?") — genuinely not implemented backend-side yet (see [Buyer search](#buyer-search-real-buyer-requirements--property-interests)); a real backend capability to build later, not something to fake in the frontend
- A `GET /features` catalog endpoint, to power an actual feature picker on the buyer-requirement form — today features can only be displayed (from existing data), never assigned, since there's no way to list valid feature keys (see [Buyer search](#buyer-search-real-buyer-requirements--property-interests))
- A public `profiles`/`users` table + RLS policies once there's an application database (see the [backend repo](https://github.com/h8hyf2rw9y-afk/StateAI---backend) — this is being tracked there, not here)
- Create/edit/delete flows for leads, properties, and appointments (Buyer Requirements already got create/edit — see [Buyer search](#buyer-search-real-buyer-requirements--property-interests))
- Sales Copilot (agent + chat UI) — Lead Intelligence and Follow-up are real now, see [AI agent integration](#ai-agent-integration)
- A bulk/dashboard-wide "refresh AI recommendations" — there's no backend endpoint to scan every lead at once yet, and building one (or a background scheduler) was explicitly out of scope for this task
- Multi-tenancy (organization/team switching, role-based permissions) — layered on top of Supabase Auth once the backend can own that data
- Profile editing (the Settings page's "Save changes" is still disabled)
- Password reset / "forgot password" flow
- A light/dark theme toggle (the tokens already support it)
- E2E tests for the auth flows this session could only verify structurally — sign-up, login, Google OAuth, and session persistence all need a real Supabase project to test end-to-end (see [Testing notes](#testing-notes))

## Testing notes

Without a real Supabase project, this session verified everything that doesn't require one:

- ✅ Route protection: every protected route (`/dashboard`, `/leads`, `/properties`, `/pipeline`, `/tasks`, `/appointments`, `/ai-assistant`, `/settings`) redirects to `/login?next=…` when signed out; `/register` stays public; `/` redirects to `/login` when signed out.
- ✅ Client-side validation on both forms: required fields, malformed email, weak password, mismatched confirm-password — all show the specific, correct inline error.
- ✅ Loading states, duplicate-submission prevention, and the password visibility toggle.
- ✅ Error handling degrades gracefully — including a real bug this caught and fixed: a failed network call was originally showing the raw `"Failed to fetch"` browser error in the UI (see `getAuthErrorMessage`'s `AuthRetryableFetchError` check in `features/auth/lib.ts`) before being mapped to a safe message.
- ✅ The Google button performs a real `signInWithOAuth` redirect (verified it navigates away to the provider's authorize URL — it does not simulate anything).
- ✅ `npm run lint`, `npm run typecheck`, `npm run test` (94 tests), and `npm run build`.

**AI agent integration** (all mocking the backend API — never a real Ollama/Anthropic call from a frontend test, per this app's rule that the frontend never talks to an LLM provider directly):
- ✅ `apiRequest` attaches the current session's bearer token (and sends none when signed out), surfaces the backend's actual `detail` message and status on failure, aborts with a clear "took too long" error past `timeoutMs`, and handles a network-level rejection — `tests/lib/api-client.test.ts`.
- ✅ `getAiErrorMessage` maps every documented backend failure mode (`503` unconfigured AI, `504` timeout, `502` provider/invalid-output, `401`/`403` auth, `404` not found, a client-side timeout, a network failure) to safe copy, and never echoes a raw backend message — `tests/features/ai/lib.test.ts`.
- ✅ Both AI panels: never call the API on mount (only on the button click), show the loading copy while in flight, render a successful result's every field, show the friendly (not raw) error message on failure and on an auth failure, and — for Follow-up specifically — render "No message was generated." instead of an empty box when `suggested_message` is `null`, and never show a priority badge when `should_follow_up` is `false` — `tests/features/ai/lead-intelligence-panel.test.tsx`, `tests/features/ai/follow-up-panel.test.tsx`.
- **Found and fixed along the way**: `@testing-library/react`'s auto-cleanup between tests never actually ran (`vitest.config.ts` doesn't set `test.globals: true`, and testing-library's auto-cleanup only registers when it detects a global `afterEach`), so any test file rendering the same text/button label more than once (as several of the new AI tests do) started failing with spurious "multiple elements found" errors. Fixed once, globally, in `tests/setup.ts` (`afterEach(() => cleanup())`) rather than patching each test file — this benefits every current and future test file, not just the new ones.

**Leads (real CRM contacts)**:
- ✅ `LeadsTable`: shows the loading state before contacts arrive (never an empty table), renders real fields (name/email/phone/role/source) with no fabricated status/score/budget column, shows a genuine empty state (not fake demo leads) when the organization has none, maps a `500` and a `401` to their respective safe messages, and navigates to `/leads/{the real contact id}` — never a mock one — on row click — `tests/features/leads/leads-table.test.tsx`.
- ✅ `LeadDetailPage`: loads and displays the real contact for the `id` in the URL, shows a not-found state (not a crash) on a `404`, and — the key security-relevant check — passes that exact same `id` to both AI panels when their buttons are clicked, confirmed via the mocked `getLeadIntelligence`/`getFollowUpRecommendation` call arguments — `tests/app/lead-detail-page.test.tsx`.
- **Found and fixed along the way**: testing a Client Component page that reads `params` via React's `use()` (this app's Next.js 16 pattern — see [Leads (real CRM contacts)](#leads-real-crm-contacts)) needs its initial render wrapped in `act(async () => ...)`, or the component gets stuck showing its Suspense fallback for the length of the test's `findBy` timeout even though the `params` promise is already resolved — documented in `tests/app/lead-detail-page.test.tsx`'s `renderPage()` helper.

**Properties (real CRM listings)** — same shape as Leads' tests, reusing the same `renderPage()` `act()` pattern for the detail page:
- ✅ `PropertiesGrid`: loading state, real fields (title/location/price/type/status) with no fabricated agent/image/operation-type, a `null` price rendering "Price on request" instead of a fabricated one, a genuine empty state, `500`/`401` error mapping, and each card linking to `/properties/{the real property id}` — `tests/features/properties/properties-grid.test.tsx`.
- ✅ `PropertyDetailPage`: loads and displays the real property for the `id` in the URL (including its real `features`), a `404` not-found state instead of a crash, and never rendering a feature badge when there are none — `tests/app/property-detail-page.test.tsx`.
- **Found and fixed along the way**: an early test asserted the literal string `"$3,400,000"` for a formatted MXN price — `Intl.NumberFormat` actually renders that as `"MX$3,400,000"` in `en-US` (disambiguating from `$` = USD), confirmed by running the formatter directly rather than guessing. Fixed by asserting the numeric substring instead of the full currency-prefixed string.
- ✅ **Real local end-to-end**: with the backend and a local Ollama (llama3.2) both running, called the exact same endpoints/paths the frontend now uses — `GET /api/v1/contacts`, `GET /api/v1/contacts/{id}`, `GET /api/v1/properties`, `GET /api/v1/properties/{id}`, `POST /api/v1/ai/lead-intelligence/{contact_id}`, `POST /api/v1/ai/follow-up/{contact_id}` — with a real Supabase session token against real backend demo data (all 20 contacts by name including Carlos/Gabriela/Carolina/Sergio, and all 14 properties) and confirmed every JSON shape matches its TypeScript type field-for-field. When Properties was added, re-checked (rather than assumed) that Contacts still worked with no code changes on that side, and relied on the backend's own 122/122 passing test suite (unaffected — no backend files touched) rather than re-running the ~100s-per-call real Lead Intelligence/Follow-up requests again for a change that never touched that code path. Could not click through a real signed-in browser session (no browser-automation tool is available in this environment) — the request-construction side of that gap is covered by the unit tests above; a final manual click-through (sign in, open Leads and Properties, click a real record, run both AI panels) is the one thing only a real browser can still confirm.

**Buyer search (real Buyer Requirements & Property Interests)**:
- ✅ `BuyerSearchSection`: loading state, passes the real `contact_id` to both the requirements and interests fetches, a genuine empty state when a contact has neither, renders an active requirement's real fields (budget/type/bedrooms/location), **keeps a cancelled/historical requirement visible** rather than hiding it (confirmed with two requirements of different status in one response, mirroring Sergio's real seeded data), renders a property interest with a working link to its real (mocked) property, `500`/`401` error mapping, and creating a new requirement through the actual dialog form ends up calling `createBuyerRequirement` with the real `contact_id` and the created result appearing immediately — `tests/features/buyer-requirements/buyer-search-section.test.tsx`.
- ✅ `MatchList`: loading state, renders real matched properties (reusing the existing `PropertyCard`, linking to the real property id), shows the real `matched_preferred_features`/`total_preferred_features` counts as a plain caption **only** when there's at least one preferred feature (never a percentage, never the word "score" — asserted explicitly), omits that caption entirely for an all-zero "0 of 0" case, the "no properties currently match this search" empty state, and `500` error mapping — `tests/features/buyer-requirements/match-list.test.tsx`.
- ✅ **Real local end-to-end, including the full write path**: beyond the usual read-only verification, actually exercised create → add location → edit (`PATCH` budget) → fetch matches → cancel (`PATCH` status) → delete against the real backend with a real Supabase token, on a throwaway requirement attached to the real Carlos contact, then deleted it and re-confirmed Carlos's real seeded requirement and Gabriela's real property-interest/buyer-requirement transition were both completely unaffected. `GET /api/v1/buyer-requirements/{id}/matches` for Carlos's real requirement returned two real properties ("Casa Valle Alto", "Casa Valle Oriente") — the same names used as illustrative examples in this task's own brief.

**Needs your real Supabase project to verify** (see [Supabase configuration](#supabase-configuration)): sign-up actually creating a user, sign-in succeeding, the "check your email" flow, Google OAuth completing end-to-end, session persistence across a page refresh, and the signed-in user's name/email/avatar rendering correctly in the header.

## Known environment note

This machine runs Node **20.17.0**. Several dependencies now declare a higher minimum — `eslint-visitor-keys`/`shadcn` CLI want `20.18.1`+, and `@supabase/supabase-js` prints a deprecation warning during build asking for Node 22+ (it still runs fine on 20.17 today; this is a forward-looking warning, not a hard failure). Everything here was verified to lint, typecheck, test, and build cleanly regardless, but `jsdom` is pinned to `26.x` in `devDependencies` specifically because `27+` depends on `require(esm)` support that Node 20.17 doesn't have. Upgrading Node past 20.19 (ideally to 22 LTS, given the Supabase warning) and bumping `jsdom` back to latest is safe whenever that's convenient.
