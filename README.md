# PropPilot — Frontend

PropPilot is the first product built under **State AI**: an AI-first CRM designed specifically for real estate professionals. It centralizes the sales process — properties, leads, pipeline, and appointments — and is architected so AI agents can eventually prioritize an agent's day instead of just displaying data back at them.

This repository is the **frontend only**. It connects directly to Supabase for authentication (see below), but every other piece of data is still realistic mock data — there is no FastAPI backend and no application database yet. The backend (FastAPI + Supabase/PostgreSQL) lives in a separate repository ([StateAI - Backend](https://github.com/h8hyf2rw9y-afk/StateAI---backend)) and is not implemented yet.

## Status

🚧 UI shell with **real Supabase authentication** (email/password + Google OAuth) and route protection. Every other page still renders from hand-written mock data in `features/*/mock-data.ts` — no database, no AI model calls, no FastAPI backend yet. See [What's mocked](#whats-mocked-vs-real) below.

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
  leads/ properties/ pipeline/ appointments/ ai/ dashboard/
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
- `lib/api/{leads,properties,pipeline,appointments}.ts` — typed functions (`getLeads`, `createLead`, `moveDeal`, …) matching a *speculative* backend shape (a `/leads` REST resource) that doesn't match how the real FastAPI backend actually models this data (`/api/v1/contacts`, not `/leads`) — **none of these are called yet**; every page still renders `features/*/mock-data.ts` directly. Wiring these up is a separate, larger task (see [What remains to be implemented](#what-remains-to-be-implemented)).
- `lib/api/ai.ts` — **two of these are real and called today**: `getLeadIntelligence(contactId)` and `getFollowUpRecommendation(contactId)`, which call the actual backend's `POST /api/v1/ai/lead-intelligence/{contact_id}` and `POST /api/v1/ai/follow-up/{contact_id}` — see [AI agent integration](#ai-agent-integration). (`getAgents`/`getRecommendations` in the same file are still speculative, like the modules above — left in place, not called anywhere.)

## What's mocked vs. real

| Area | Status |
|---|---|
| Login, Register, Google OAuth, logout, route protection | **Real** — Supabase Auth, see below |
| Session (name/email/avatar in the header, dashboard greeting, settings) | **Real** — read from the live Supabase session, never hardcoded |
| Leads, Properties, Pipeline, Appointments list pages | Real UI, **mock data** (`features/*/mock-data.ts`) |
| Dashboard "Today's priorities" / hot leads / pipeline overview | Real UI, **derived from mock data** (`features/dashboard/lib.ts`) |
| "Add lead" / "Add property" / "Schedule appointment" | **Disabled** — no create flow exists yet (needs the FastAPI backend + DB) |
| Settings → "Save changes" | **Disabled** — profile editing isn't implemented yet |
| Lead detail page (`/leads/[id]`) → **Lead Intelligence** and **Follow-up** panels | **Real** — calls the actual FastAPI backend, which calls a real local LLM (Ollama/llama3.2 today) — see [AI agent integration](#ai-agent-integration) |
| AI Assistant dashboard → agent cards | **Real status** (Lead Intelligence/Follow-up show "Available" and link to a lead; Sales Copilot stays "Coming soon") |
| AI Assistant dashboard → "Recent recommendations" list | Real UI, **hand-written placeholder copy**, not model output — there's no backend endpoint to scan every lead at once, and building one was out of scope (see [What remains to be implemented](#what-remains-to-be-implemented)) |
| Sales Copilot chat | **Inert placeholder** — no client state, no fake responses |

## How authentication works

Supabase Auth is the identity provider. There is no custom session/JWT handling anywhere in this repo — everything goes through `@supabase/ssr`, which is Supabase's official cookie-based session helper for SSR frameworks.

- **Sign up** (`features/auth/components/register-form.tsx`) calls `supabase.auth.signUp()` with `email`/`password`, storing first/last name in `options.data` (Supabase Auth's `user_metadata` — **not** a separate `users` table; no application database exists yet). If the project requires email confirmation (the default), the form shows a "check your email" state instead of redirecting.
- **Sign in** (`features/auth/components/login-form.tsx`) calls `supabase.auth.signInWithPassword()` and redirects to `/dashboard` (or wherever `proxy.ts` originally bounced the user from, via `?next=`).
- **Google OAuth** (`features/auth/components/google-button.tsx`, used by both forms) calls `supabase.auth.signInWithOAuth({ provider: "google" })`, which redirects the browser to Google, then back to `app/auth/callback/route.ts`. That route exchanges the one-time `code` for a session server-side (`exchangeCodeForSession`) and redirects to `/dashboard` — the access/refresh tokens never appear in a URL or in client-side JS.
- **Session persistence** is handled entirely by `@supabase/ssr` via cookies (never `localStorage`, and there's no custom token handling to audit). `lib/supabase/client.ts` is the browser client; `lib/supabase/server.ts` is the server client used in Server Components, Server Actions, and Route Handlers.
- **Logout** (`components/layout/user-menu.tsx`) calls `supabase.auth.signOut()`, then redirects to `/login`.
- **UI state** — "am I logged in, as whom" — comes from `hooks/useUser.ts`, a small client hook built on `supabase.auth.onAuthStateChange()`. It does not do any redirecting itself; it's for *display* only (the user menu, the dashboard greeting).

## How protected routes work

`proxy.ts` (Next.js 16 renamed Middleware to **Proxy** — same file convention and API) runs on every request. Its logic lives in `lib/supabase/proxy.ts` so it's testable independently:

1. Refresh the Supabase session (rewrites the session cookie if the access token was near expiry) — this must run before anything else, or sessions randomly drop.
2. If the request is for a protected route (`/dashboard`, `/leads`, `/properties`, `/pipeline`, `/appointments`, `/ai-assistant`, `/settings`, or any sub-path) and there's no session, redirect to `/login?next=<original path>`.
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
- **Timeouts**: `apiRequest` now aborts client-side after a configurable `timeoutMs` (default 30s for the rest of `lib/api/`, unused today since nothing else is wired up) rather than waiting forever. The two AI functions pass `200_000` (200s) — comfortably above the backend's own `OLLAMA_TIMEOUT_SECONDS=180`, so the frontend never cancels a request the backend is still legitimately working on. Real measured latency on this project's CPU-only dev hardware is **93-125 seconds per call** — both panels show an explicit "Analyzing lead…" / "Generating follow-up recommendation…" loading state plus a "this may take up to a couple of minutes" note, specifically so that wait never looks like a frozen UI.
- **Error UX**: connection/provider failures, timeouts, and auth failures all render through the same `FormError` banner already used by the login/register forms — never a raw exception, stack trace, or internal detail (model name, provider, hardware). A `null` `suggested_message` renders "No message was generated." — the panel never fabricates one.
- **The lead detail page is new** (`app/(dashboard)/leads/[id]/page.tsx`) — this app had no per-entity detail page before this task, only list pages. Its profile header still reads from `features/leads/mock-data.ts` (the leads list itself isn't wired to the real backend yet), but the two AI panels always use the URL's `id` as the real `contact_id` regardless of whether a matching mock lead was found — so navigating directly to a real Supabase contact's UUID (e.g. a backend demo contact) exercises the real agents even though the mock leads list's own ids don't correspond to real contacts. `features/leads/components/leads-table.tsx` rows now navigate here on click.

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
- **Pipeline stage is one shared vocabulary.** A lead's "status" and a deal's "stage" are the same `PipelineStage` type (`features/pipeline/types.ts`), reused by the Leads table and the Pipeline board, so the two views can't drift apart.
- **`lib/utils.ts` stays reserved for shadcn's `cn` helper** (every generated `components/ui/*` file imports `@/lib/utils` by convention). Other formatting helpers live in `lib/format.ts` instead of a `lib/utils/` folder, to avoid a same-name file/folder ambiguity.
- **Icons in nav config are names, not components.** `components/navigation/nav-config.ts` is read by a Server Component and passed into a Client Component (`NavLink`); a Lucide icon is a `forwardRef` component, and passing one directly across that boundary fails at build time. Icons are stored as string names and resolved locally inside the Client Component instead — the same pattern used for AI agent icons (`features/ai/types.ts`).
- **Multi-tenancy isn't implemented, but isn't blocked either.** `types/user.ts` models `Organization → Team → User` so backend-driven multi-tenancy doesn't require a frontend rewrite later.
- **No schema validation library for auth forms.** `features/auth/validation.ts` is hand-rolled (email regex, password length/character checks, confirm-match) rather than pulling in Zod for five form fields — Supabase re-validates everything server-side regardless, so this is a UX layer only.
- **`useUser()` never redirects.** It's a display-only hook (`hooks/useUser.ts`); all access control happens in `proxy.ts`, which runs before any page renders. Mixing redirect logic into a hook that also drives UI (the user menu) risks fighting the proxy redirect or flashing protected content.

## Security notes

- No secrets live in this repo. `.env.example` documents the only environment variables the frontend uses — `NEXT_PUBLIC_API_URL` and the two Supabase ones — and none of them are secret: anything prefixed `NEXT_PUBLIC_` is bundled into client-side JS, and the Supabase publishable/anon key is specifically designed to be public (it only ever grants what your Row Level Security policies allow).
- The Supabase `service_role` key is never referenced anywhere in this codebase, and must never be added here — it bypasses all access control and belongs only in a backend environment (the future FastAPI service), never in `NEXT_PUBLIC_*` or any frontend code path.
- There is no OpenAI/Anthropic/Ollama key or connection anywhere in this codebase either — the frontend talks only to the FastAPI backend (`NEXT_PUBLIC_API_URL`), never directly to an LLM provider; the backend alone owns that integration.
- The two real AI calls (`lib/api/ai.ts`) send only `contact_id` — never `organization_id` — as the frontend has no way to know or assert the caller's organization; that's derived entirely server-side from the verified bearer token. See [AI agent integration](#ai-agent-integration).
- Sessions live in cookies via `@supabase/ssr` — never `localStorage`, and there is no hand-rolled JWT handling to audit. `lib/api/client.ts` reads the same session (via `getSession()`) to attach the bearer token sent to the backend — it doesn't create or store a separate token anywhere.
- `proxy.ts` is an optimistic, UX-level check (see [How protected routes work](#how-protected-routes-work)) — it is **not** the final security boundary. The FastAPI backend must independently verify every request's Supabase JWT once it exists; nothing here should be trusted as authorization by itself.

## What remains to be implemented

- Wiring the Leads/Properties/Pipeline/Appointments **list** pages to the real backend instead of `features/*/mock-data.ts` — a separate, larger task than AI integration, since it means adopting the backend's actual resource shape (`/api/v1/contacts`, not the `/leads` shape `lib/api/leads.ts` was speculatively typed against)
- A public `profiles`/`users` table + RLS policies once there's an application database (see the [backend repo](https://github.com/h8hyf2rw9y-afk/StateAI---backend) — this is being tracked there, not here)
- Create/edit/delete flows for leads, properties, and appointments
- Sales Copilot (agent + chat UI) — Lead Intelligence and Follow-up are real now, see [AI agent integration](#ai-agent-integration)
- A bulk/dashboard-wide "refresh AI recommendations" — there's no backend endpoint to scan every lead at once yet, and building one (or a background scheduler) was explicitly out of scope for this task
- Multi-tenancy (organization/team switching, role-based permissions) — layered on top of Supabase Auth once the backend can own that data
- Profile editing (the Settings page's "Save changes" is still disabled)
- Password reset / "forgot password" flow
- A light/dark theme toggle (the tokens already support it)
- E2E tests for the auth flows this session could only verify structurally — sign-up, login, Google OAuth, and session persistence all need a real Supabase project to test end-to-end (see [Testing notes](#testing-notes))

## Testing notes

Without a real Supabase project, this session verified everything that doesn't require one:

- ✅ Route protection: every protected route (`/dashboard`, `/leads`, `/properties`, `/pipeline`, `/appointments`, `/ai-assistant`, `/settings`) redirects to `/login?next=…` when signed out; `/register` stays public; `/` redirects to `/login` when signed out.
- ✅ Client-side validation on both forms: required fields, malformed email, weak password, mismatched confirm-password — all show the specific, correct inline error.
- ✅ Loading states, duplicate-submission prevention, and the password visibility toggle.
- ✅ Error handling degrades gracefully — including a real bug this caught and fixed: a failed network call was originally showing the raw `"Failed to fetch"` browser error in the UI (see `getAuthErrorMessage`'s `AuthRetryableFetchError` check in `features/auth/lib.ts`) before being mapped to a safe message.
- ✅ The Google button performs a real `signInWithOAuth` redirect (verified it navigates away to the provider's authorize URL — it does not simulate anything).
- ✅ `npm run lint`, `npm run typecheck`, `npm run test` (58 tests), and `npm run build`.

**AI agent integration** (added this session, all mocking the backend API — never a real Ollama/Anthropic call from a frontend test, per this app's rule that the frontend never talks to an LLM provider directly):
- ✅ `apiRequest` attaches the current session's bearer token (and sends none when signed out), surfaces the backend's actual `detail` message and status on failure, aborts with a clear "took too long" error past `timeoutMs`, and handles a network-level rejection — `tests/lib/api-client.test.ts`.
- ✅ `getAiErrorMessage` maps every documented backend failure mode (`503` unconfigured AI, `504` timeout, `502` provider/invalid-output, `401`/`403` auth, `404` not found, a client-side timeout, a network failure) to safe copy, and never echoes a raw backend message — `tests/features/ai/lib.test.ts`.
- ✅ Both AI panels: never call the API on mount (only on the button click), show the loading copy while in flight, render a successful result's every field, show the friendly (not raw) error message on failure and on an auth failure, and — for Follow-up specifically — render "No message was generated." instead of an empty box when `suggested_message` is `null`, and never show a priority badge when `should_follow_up` is `false` — `tests/features/ai/lead-intelligence-panel.test.tsx`, `tests/features/ai/follow-up-panel.test.tsx`.
- **Found and fixed along the way**: `@testing-library/react`'s auto-cleanup between tests never actually ran (`vitest.config.ts` doesn't set `test.globals: true`, and testing-library's auto-cleanup only registers when it detects a global `afterEach`), so any test file rendering the same text/button label more than once (as several of the new AI tests do) started failing with spurious "multiple elements found" errors. Fixed once, globally, in `tests/setup.ts` (`afterEach(() => cleanup())`) rather than patching each test file — this benefits every current and future test file, not just the new ones.
- ✅ **Real local end-to-end**: with the backend and a local Ollama (llama3.2) both running, called the exact same endpoints/paths the frontend now uses (`POST /api/v1/ai/lead-intelligence/{contact_id}`, `POST /api/v1/ai/follow-up/{contact_id}`) with a real Supabase session token against two real backend demo contacts (Carlos, Gabriela) and confirmed the JSON returned matches `LeadIntelligenceResult`/`FollowUpResult` field-for-field. Could not click through a real signed-in browser session (no browser-automation tool is available in this environment) — the request-construction side of that gap is covered by the `apiRequest` unit tests above; a final manual click-through (sign in, open a lead, click both buttons) is the one thing only a real browser can still confirm.

**Needs your real Supabase project to verify** (see [Supabase configuration](#supabase-configuration)): sign-up actually creating a user, sign-in succeeding, the "check your email" flow, Google OAuth completing end-to-end, session persistence across a page refresh, and the signed-in user's name/email/avatar rendering correctly in the header.

## Known environment note

This machine runs Node **20.17.0**. Several dependencies now declare a higher minimum — `eslint-visitor-keys`/`shadcn` CLI want `20.18.1`+, and `@supabase/supabase-js` prints a deprecation warning during build asking for Node 22+ (it still runs fine on 20.17 today; this is a forward-looking warning, not a hard failure). Everything here was verified to lint, typecheck, test, and build cleanly regardless, but `jsdom` is pinned to `26.x` in `devDependencies` specifically because `27+` depends on `require(esm)` support that Node 20.17 doesn't have. Upgrading Node past 20.19 (ideally to 22 LTS, given the Supabase warning) and bumping `jsdom` back to latest is safe whenever that's convenient.
