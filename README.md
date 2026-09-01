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
- `lib/api/{leads,properties,pipeline,appointments,ai}.ts` — typed functions (`getLeads`, `createLead`, `moveDeal`, …) matching each feature's data shape. **None of these are called yet** — every page renders `features/*/mock-data.ts` directly. Pointing a page at the real API instead of mock data is meant to be a one-line change, since the return shapes already match.

## What's mocked vs. real

| Area | Status |
|---|---|
| Login, Register, Google OAuth, logout, route protection | **Real** — Supabase Auth, see below |
| Session (name/email/avatar in the header, dashboard greeting, settings) | **Real** — read from the live Supabase session, never hardcoded |
| Leads, Properties, Pipeline, Appointments, AI Assistant pages | Real UI, **mock data** (`features/*/mock-data.ts`) |
| Dashboard "Today's priorities" / hot leads / pipeline overview | Real UI, **derived from mock data** (`features/dashboard/lib.ts`) |
| "Add lead" / "Add property" / "Schedule appointment" | **Disabled** — no create flow exists yet (needs the FastAPI backend + DB) |
| Settings → "Save changes" | **Disabled** — profile editing isn't implemented yet |
| AI agent cards / recommendations | Real UI, **hand-written placeholder copy**, not model output |
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
- There is no OpenAI/Anthropic or other third-party key anywhere in this codebase either — those belong to the backend too.
- Sessions live in cookies via `@supabase/ssr` — never `localStorage`, and there is no hand-rolled JWT handling to audit.
- `proxy.ts` is an optimistic, UX-level check (see [How protected routes work](#how-protected-routes-work)) — it is **not** the final security boundary. The FastAPI backend must independently verify every request's Supabase JWT once it exists; nothing here should be trusted as authorization by itself.

## What remains to be implemented

- The FastAPI backend, and wiring pages to `lib/api/*` instead of mock data once it exists
- A public `profiles`/`users` table + RLS policies once there's an application database (see the [backend repo](https://github.com/h8hyf2rw9y-afk/StateAI---backend) — this is being tracked there, not here)
- Create/edit/delete flows for leads, properties, and appointments
- The real AI agents (Lead Intelligence, Follow-up, Sales Copilot) and the Sales Copilot chat
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
- ✅ `npm run lint`, `npm run typecheck`, `npm run test` (32 tests), and `npm run build` (all routes, including with **zero** Supabase env vars set, to confirm a fresh clone doesn't crash before Supabase is configured).

**Needs your real Supabase project to verify** (see [Supabase configuration](#supabase-configuration)): sign-up actually creating a user, sign-in succeeding, the "check your email" flow, Google OAuth completing end-to-end, session persistence across a page refresh, and the signed-in user's name/email/avatar rendering correctly in the header.

## Known environment note

This machine runs Node **20.17.0**. Several dependencies now declare a higher minimum — `eslint-visitor-keys`/`shadcn` CLI want `20.18.1`+, and `@supabase/supabase-js` prints a deprecation warning during build asking for Node 22+ (it still runs fine on 20.17 today; this is a forward-looking warning, not a hard failure). Everything here was verified to lint, typecheck, test, and build cleanly regardless, but `jsdom` is pinned to `26.x` in `devDependencies` specifically because `27+` depends on `require(esm)` support that Node 20.17 doesn't have. Upgrading Node past 20.19 (ideally to 22 LTS, given the Supabase warning) and bumping `jsdom` back to latest is safe whenever that's convenient.
