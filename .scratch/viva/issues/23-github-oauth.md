# 23: GitHub OAuth, both scopes: repo list → latest commit → selection screen

**What to build:** The GitHub path into a viva:
1. The student clicks "Connect GitHub", authorizes with `public_repo` scope, and lands back in the app with their public repos listed, most recently pushed first.
2. Picking a repo fetches the tree of the latest commit on its default branch (there is no commit picker).
3. Eligible functions are extracted from its JavaScript files, scope-check rejections are shown with reasons, and the viva hands off to the selection screen.

A separate, clearly labelled "Also include private repos" step runs a second, full OAuth flow with `repo` scope; afterwards private repos appear in the list too. A viva is generated only on request: no webhooks, no polling, no stored last-seen commit. Viva only ever reads.

**Blocked by:** 08

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 01 §1–5, 01 §7, 09 §5

- [ ] "Connect GitHub" requests `public_repo` only.
- [ ] "Also include private repos" is its own step, with its own button and copy, and runs a second OAuth flow requesting `repo`; it is never bundled into the first.
- [ ] The repo list reflects whichever scope is currently granted.
- [ ] Always the latest commit on the default branch GitHub reports; no UI suggests a commit picker.
- [ ] Only JavaScript files are fetched; dependency directories, build output, and minified files are skipped (the exact list is a Ruling here). A repo with no eligible functions says so.
- [ ] The OAuth callback is the path `CLAUDE.md` names, and the client secret never reaches the browser.
- [ ] No write call to GitHub exists anywhere in the code.
- [ ] No per-student state persists beyond what the session needs to hold the token; the holding mechanism is a Ruling here.
- [ ] Prerequisite (Hatim): a GitHub OAuth App registered with the production alias's callback URL, and its client id and secret set as Vercel environment variables. The ticket stays `claimed` with this box unchecked until they exist.
- [ ] Verified on the production alias after the merge to `main` (OAuth works nowhere else): both flows, public and private listing, and one viva run from a real repo. The main session ticks this box after the merge.

## Comments
