# 23: GitHub OAuth, both scopes: repo list → latest commit → selection screen

**What to build:** The GitHub path into a viva:
1. The student clicks "Connect GitHub", authorizes with `public_repo` scope, and lands back in the app with their public repos listed, most recently pushed first.
2. Picking a repo fetches the tree of the latest commit on its default branch (there is no commit picker).
3. Eligible functions are extracted from its JavaScript files, scope-check rejections are shown with reasons, and the viva hands off to the selection screen.

A separate, clearly labelled "Also include private repos" step runs a second, full OAuth flow with `repo` scope; afterwards private repos appear in the list too. A viva is generated only on request: no webhooks, no polling, no stored last-seen commit. Viva only ever reads.

**Blocked by:** 08

**Status:** done

**Type:** plumbing
**Spec:** 01 §1–5, 01 §7, 09 §5

- [x] "Connect GitHub" requests `public_repo` only.
- [x] "Also include private repos" is its own step, with its own button and copy, and runs a second OAuth flow requesting `repo`; it is never bundled into the first.
- [x] The repo list reflects whichever scope is currently granted.
- [x] Always the latest commit on the default branch GitHub reports; no UI suggests a commit picker.
- [x] Only JavaScript files are fetched; dependency directories, build output, and minified files are skipped (the exact list is a Ruling here). A repo with no eligible functions says so.
- [x] The OAuth callback is the path `CLAUDE.md` names, and the client secret never reaches the browser.
- [x] No write call to GitHub exists anywhere in the code.
- [x] No per-student state persists beyond what the session needs to hold the token; the holding mechanism is a Ruling here.
- [x] Prerequisite (Hatim): a GitHub OAuth App registered with the production alias's callback URL, and its client id and secret set as Vercel environment variables. The ticket stays `claimed` with this box unchecked until they exist.
- [ ] Verified on the production alias after the merge to `main` (OAuth works nowhere else): both flows, public and private listing, and one viva run from a real repo. The main session ticks this box after the merge.

## Answer

Built the GitHub path end to end: `api/auth/start.ts` + `api/auth/callback.ts` run the two OAuth
round-trips (public_repo, then a separate repo-scope upgrade), handing the resulting token to the
browser via a small HTML page rather than JSON (the response *is* the redirect landing page).
`src/github/token-store.ts` holds it in `sessionStorage` for the rest of the tab's life, `src/github/api.ts`
makes the three read-only GitHub calls (list repos, fetch the default-branch tree, fetch a blob),
`src/github/tree-filter.ts` picks which tree entries are eligible `.js` files, and `src/github/ingest.ts`
wires fetch → filter → `scanFunctions` into the same `{eligible, rejected}` shape the demo corpus
already produces. `src/ui/GitHubConnect.tsx` is the connect/list/pick UI; `App.tsx` (the ingestion
entry point) renders it above `SelectionScreen`, which now takes `fixtures`/`rejected`/`sourceLabel`/
`sourceNote` as optional props (defaulting to the demo corpus, so it's unchanged for anyone not
passing them) — this is how the demo fixtures stay available alongside a connected repo, per the
ticket description, rather than being replaced by it.

Offline-testable per the dispatch note: `src/github/tree-filter.test.ts` (file selection),
`src/github/token-store.test.ts` (the token-holding mechanism), `src/github/oauth.test.ts`
(authorize-URL building and code exchange against a stubbed `fetch`), and
`api/auth/callback.test.ts` (the callback handler exercised directly with a stubbed `fetch`,
including that the client secret is sent to GitHub but never appears in the response body). All
228 project tests pass, `npm run typecheck` and `npm run build` are clean, and both `api/auth/*.ts`
compile clean under the ticket's `nodenext`/ESM check. The dev adapter in `vite.config.ts` now
resolves one nested path segment (so `/api/auth/start` and `/api/auth/callback` work under
`npm run dev`, not just single-segment `/api/<name>`) and supports `setHeader`/`end` for the
handlers' HTML/redirect responses, not just `status().json()`.

Not exercised live in this session (needs real GitHub credentials and the production alias):
the actual browser round-trip through GitHub's consent screen, real repo listing, real tree/blob
fetches, and a viva run from a real repo. That's the ticket's last checkbox, explicitly deferred
to the main session after merge to `main` — OAuth only works there.

## Comments

- Ruling: the file-selection skip list (`src/github/tree-filter.ts`) is exactly
  `node_modules`, `bower_components`, `vendor`, `dist`, `build`, `out`, `output`, `.next`,
  `.nuxt`, `.svelte-kit`, `coverage`, `.git`, `.turbo`, `.cache` as directory names, plus any
  `*.min.js` file, plus anything not ending in a plain `.js` extension (no `.jsx`/`.ts`, matching
  the demo corpus's own JS-only scope). No `.gitignore` parsing, no config. Cost if wrong: a repo
  with an unusual build-output directory name shows a few extra "not eligible" rejected entries
  rather than silently mis-scoping — `scanFunctions` still runs its own scope check on whatever
  text is handed to it either way.

- Ruling: the token-holding mechanism is `sessionStorage` (`src/github/token-store.ts`), behind an
  injectable-storage `TokenStore` class with an in-memory fallback for a non-browser context. A
  plain in-memory JS variable doesn't survive the callback's full-page navigation back into the
  app, and nothing here ever touches `localStorage` or a cookie, so the token disappears with the
  tab — no explicit sign-out step needed, and no per-student state outlives what the ticket allows.
  Cost if wrong: a student who leaves the tab open indefinitely keeps holding their own token in
  that tab only; never shared across tabs, devices, or students.

- Ruling: env var names `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
  (`GITHUB_CLIENT_ID_ENV_VAR`/`GITHUB_CLIENT_SECRET_ENV_VAR` in `src/github/oauth.ts`, each named
  once). The prerequisite note said the client id/secret are set as Vercel env vars but not what
  they're called — **Hatim must confirm these are the actual variable names on Vercel**, or the
  live callback fails closed with a clear "`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` not set on
  the server" error page rather than silently misbehaving.

- Ruling: OAuth's own `state` param carries `{scope}:{random}` and the callback does not verify it
  was echoed back unchanged beyond GitHub's own redirect mechanics — there's no server-side session
  to stash a per-request nonce in without violating the "no per-student state" checkbox. This is
  boilerplate CSRF hygiene, not a real cross-site protection; noted in `api/auth/start.ts`. Cost if
  wrong: no worse than any other link-click-completes-an-action exposure.

- Note: one `POST` exists in this ticket's code — `src/github/oauth.ts`'s call to
  `github.com/login/oauth/access_token`, the OAuth code-exchange call the protocol requires. It
  writes nothing to a repository; every call that touches repo data (`src/github/api.ts`: list
  repos, fetch tree, fetch blob) is a `GET`. Read the "no write call to GitHub" checkbox as "no
  call that writes repository data," which is what `01 §2`'s caveat about `repo` scope's unused
  write grant is actually about.

- Left for whoever wires ticket 09's disclosure doc: `09-disclosure.md` §5 already has the GitHub
  OAuth scope note drafted; nothing in this ticket's code needs it, since disclosure is a separate
  written document, not an in-product panel (per that doc's own header).
