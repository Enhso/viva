# 02: Extraction and scope check across the fixture corpus

**What to build:** Loading the fixture corpus (bootcamp, out-of-scope, and anything in `own/`) lists every eligible function with its signature, and its docstring/JSDoc when present. When a docstring is absent the card says so, with an explicit, muted "no docstring provided": never a heuristic stand-in and never a model-written description. Files and functions the scope check excludes (React components/JSX, code touching the DOM, code touching the network) appear with a visible reason; nothing is silently skipped. The student can start a viva on any eligible function; the tracer bullet's flow is now fed by the full list.

**Blocked by:** 01

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 01 §5–7

- [ ] All twelve bootcamp functions are extracted as eligible functions, `average` included (see Ruling).
- [ ] Each eligible function carries its full source, signature, and docstring or an absence flag.
- [ ] A function without a docstring shows "no docstring provided" in muted styling. No first-line-of-body or model-generated fallback exists anywhere in the code path.
- [ ] `Counter.jsx`, `getWeather`, and `toggleMenu` are rejected, each with a visible reason naming what triggered it (JSX/React, network, DOM).
- [ ] The scope check reads the syntax tree: a comment or string that merely mentions `fetch` or `document` does not trigger a rejection.
- [ ] Nested functions stay part of their parent's source; they are not separate eligible functions.
- [ ] A file that fails to parse is reported with a visible reason and does not stop the rest of the corpus.
- [ ] Engine changes are test-first; the fallback pipeline test stays green.

## Comments

Ruling: arrow functions and function expressions assigned to a top-level `const`/`let` are eligible functions, as are their exported forms — spec said "function declarations", `average.js` is an arrow function in a `const` and bootcamp code writes functions this way constantly, so both forms are included — cost if wrong: a few extra eligible functions on the selection screen. (R1, approved by Hatim at breakdown review, 2026-09-26.)
