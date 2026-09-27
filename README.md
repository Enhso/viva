# Viva

An oral-style exam generated from a student's own JavaScript, graded by running the code.

Viva takes a function the student wrote and makes small, mechanical changes to it, called **mutants**: `<` becomes `<=`, `+` becomes `-`, a `return` disappears. A model picks the mutants worth asking about and names the misconception each one probes. The student sees the mutated code and an input, predicts the output, and says how confident they are. Then Viva runs both versions and reveals the truth.

The answer key always comes from executing the original and the mutant, never from a model's opinion. The report groups the answers into four calibration buckets (confidently right, confidently wrong, uncertain and right, uncertain and wrong) and shows a Brier score, so the student sees not just what they got wrong but where their confidence misled them.

## How it works

1. **Extraction and scope check.** Top-level functions are pulled from the student's files. React components and code that touches the DOM or the network are excluded, each with a visible reason.
2. **Selection.** Functions are ordered by a model-free complexity score, and the student chooses how many to include.
3. **Rule engine.** A fixed set of syntax-tree rules produces every candidate mutant: relational flips, equality swaps, off-by-one literals, and so on.
4. **Filter call.** One model call per viva keeps the *loaded* mutants and gives each a taxonomy label. Functions whose candidate list is too large first go through a smaller *triage* call.
5. **Answer key.**
   - A shared battery of inputs, then a bounded property-based search, finds the inputs where each mutant's output differs from the original's.
   - A mutant with no such input is dropped.
   - A timeout never counts as a difference.
6. **Beats.** Each beat is one predict-then-reveal cycle on one input. The student answers as free text or picks from options drawn from other mutants' real outputs, and sets their confidence at 0.1% precision.
7. **Report.** Calibration buckets and the Brier score. Labels are grouped by concept, which is model-assisted and marked as provisional.

Runs are labelled everywhere by mode:

| Mode | When it happens |
| --- | --- |
| Live | A provider answered the filter call. |
| Cached | Replaying a saved response for unchanged code, with zero provider calls. |
| Fallback | No model: default edge-case inputs, the first mutant that changes the output, templated wording. Used when every provider fails, when no filter prompt exists, or when forced by the demo switch. |

## Requirements

- **Node.js 22.12 or newer.** `.nvmrc` pins it; Vitest 5 needs it.
- **npm**, which comes with Node.
- *Optional,* for the live path: API keys for at least one provider in the chain (OpenRouter, Google Gemini, NVIDIA). Without keys, every viva runs in fallback mode, which is fully functional.
- *Optional,* for reading a student's repository: a GitHub OAuth App.
- *Optional,* for deployment: a Vercel project.

## Install

```sh
git clone https://github.com/Enhso/viva.git
cd viva
nvm use          # or any Node >= 22.12
npm ci
```

**Runtime dependencies:**
- `react` and `react-dom`: the UI.
- `acorn` and `acorn-jsx`: parsing student code and predictions.
- `fast-check`: the bounded property-based search for distinguishing inputs.

**Development dependencies:** Vite, Vitest, TypeScript, `@vitejs/plugin-react`, and `tsx` (it runs the scripts under `scripts/`).

## Configuration

All keys are read **server-side only**, by the serverless functions under `api/`. They never reach the browser bundle, so never prefix them with `VITE_`.

| Variable | Used for | Needed |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Filter and triage calls; first link of the chain | For live mode (any one provider is enough) |
| `GEMINI_API_KEY` | Filter and triage calls, second link; also the embeddings that group labels | For live mode and label grouping |
| `NVIDIA_API_KEY` | Filter and triage calls; third link | Optional |
| `TYPESAFE_API_KEY` | Jev, TypeSafe's same-or-different judgement for grouping labels | Optional: without it, grouping falls back to embeddings, then to exact label text |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client id | To connect a GitHub repository |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret | To connect a GitHub repository |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store for the candidate log | Not used yet (reserved for ticket 15) |

A provider whose key is missing is still called, just without an auth header. In a hosted environment a proxy may supply the credentials; otherwise that link fails and the chain moves on to the next provider.

Example `.env.local`. The values are placeholders; replace them with your own and never commit the file (`.env*` and `*.local` are gitignored):

```sh
OPENROUTER_API_KEY=your-openrouter-api-key
GEMINI_API_KEY=your-gemini-api-key
NVIDIA_API_KEY=your-nvidia-api-key
TYPESAFE_API_KEY=your-typesafe-api-key
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
```

Vite doesn't pass `.env` files to the `api/` functions it serves in development, so export the variables into the shell before starting the dev server:

```sh
set -a; . ./.env.local; set +a
npm run dev
```

### GitHub OAuth App

1. Create one under GitHub → Settings → Developer settings → OAuth Apps.
2. Set the **Authorization callback URL** to `https://<your-domain>/api/auth/callback`. For local testing, use a second OAuth App with `http://localhost:5173/api/auth/callback`.
3. Put its client id and secret in `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

Viva asks for the `public_repo` scope by default. The broader `repo` scope, for private repositories, is requested only through a separate, explicit second step. Viva only ever reads.

## Run commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on http://localhost:5173. It also serves `api/*.ts`, so live vivas and OAuth work locally. |
| `npm run build` | Typecheck, then production build into `dist/`. |
| `npm run preview` | Serves the built `dist/`. Static only: no `api/`, so vivas fall back. |
| `npm test` | Vitest: engine, grading, llm and ui logic, with property-based tests on a fixed seed. |
| `npm run typecheck` | `tsc -b --noEmit` across the app and `api/`. |
| `npm run check:api` | Typechecks `api/` under Node's ESM rules, as Vercel runs it: relative imports need their `.js` extension. |
| `npm run filter-lab -- [vNNN] [--compare vMMM] [--only <fixture>] [--provider <name>]` | Runs the fixture corpus through a filter prompt version. Results go to `.scratch/filter-lab/<version>/results.json`; responses are cached, so a re-run of unchanged input makes no provider calls. |
| `npm run probe:providers` | One tiny call per provider in the chain, plus a Jev check. Prints status and latency. |

CI (`.github/workflows/ci.yml`) runs `typecheck`, `test`, `build` and `check:api` on every pull request.

## Models and prompts

- **Provider chain** (`src/llm/providers.ts`), tried in order, each with a 75 s budget and one retry on 429/503:
  1. OpenRouter `nvidia/nemotron-3-super-120b-a12b:free`, reasoning off.
  2. Gemini `gemini-3.8-flash`, JSON mode and low thinking.
  3. NVIDIA `nvidia/nemotron-3-super-120b-a12b`, thinking off.

  Model ids change often: run `npm run probe:providers` after editing them. A response that misses or repeats a candidate id counts as that provider failing.
- **Filter prompts** (`prompts/filter/vNNN.md`): the highest-numbered version is used. `_output-contract.md` is appended after the prompt text, so rewording a prompt never breaks parsing. With no `vNNN.md` present, vivas run in fallback mode and say why.
- **Triage prompt** (`prompts/triage/`): used only for a function whose candidate list exceeds 20,000 estimated tokens.
- **Label grouping** (`api/group-labels.ts`): Jev first, then Gemini `gemini-embedding-001` with a cosine similarity of at least 0.85, then exact text.

## Data

- **Fixtures** (`fixtures/functions/`):
  - `bootcamp/`: twelve student-style functions, the default corpus.
  - `own/`: your own functions, copied in unedited.
  - `out-of-scope/`: code the scope check must reject.
  - `fixtures/triage-stress/`: one oversized function that triggers triage.
- **Filter-lab output:** `.scratch/filter-lab/`, plus one row per candidate appended to `logs/candidates.csv`.
- **In the browser:** cached filter responses live in `localStorage`; the "Clear cached filter responses" button empties it. The GitHub token lives in `sessionStorage` for the tab's lifetime.
- **No database, no accounts, no stored student code.**

## Deploying on Vercel

1. Import the repository. Vercel detects the Vite frontend and serves `api/*.ts` as Node.js functions.
2. Add the variables from [Configuration](#configuration) for Production, Preview and Development.
3. `vercel.json` ships `prompts/filter/` and `prompts/triage/` with `api/filter.ts`. Keep it in sync if you add a prompt directory; a test checks this.
4. GitHub OAuth works on the domain registered in the OAuth App. Preview URLs differ per branch, so verify OAuth on the production domain.
5. If Deployment Protection is on, automated checks need Vercel's "Protection Bypass for Automation" secret, sent as the `x-vercel-protection-bypass` header.

## Project layout

```text
src/engine/    extraction, rule engine, sandbox (Node vm + Web Worker), battery, answer key: model-free
src/grading/   prediction reading, Brier score, calibration buckets, report: model-free
src/llm/       provider chain, filter + triage calls, caches, label grouping
src/github/    OAuth helpers and repository ingestion
src/ui/        React screens, string tables (en, fr), styles.css
api/           Vercel functions: filter, group-labels, auth/start, auth/callback, health
prompts/       filter prompts (vNNN.md) and triage prompt
fixtures/      function corpus for the app and the filter lab
scripts/       filter-lab, provider probe, Claude Code session hooks
docs/spec/     the design spec (brief + 00–10)
```

`src/engine/` and `src/grading/` must never reach `src/llm/`. A test enforces this, including indirect imports.

## Further reading

- `docs/spec/`: the approved design, with the rationale behind every choice above.
- `CONTEXT.md`: the glossary (beat, loaded mutant, distinguishing input, calibration bucket, …).
- `.scratch/viva/issues/`: the tickets, each with acceptance criteria and every judgement call recorded as a ruling.
- `.scratch/handoffs/2026-09-27-1402-post-hackathon.md` and `.scratch/TODO.md`: current state and what remains.
- `CLAUDE.md`: working agreements for AI coding agents in this repository.

## License

MIT; see `LICENSE`.
