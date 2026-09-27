# Brief: explain-diff report for one Enhso/viva PR

Reader: Hatim, the project's author, who must **defend this project** (to hackathon judges and mentors). He needs to understand every decision well enough to justify it under questioning: what the change does, why it's built this way, what alternatives were rejected, what is verified by execution versus proposed by a model, and where the known gaps are. Be honest about gaps: a defence that hides them fails at the first hard question.

Repo: /home/user/viva (read-only for you: do not edit, commit, or push anything in it). Project context: `CLAUDE.md`, `CONTEXT.md` (the glossary: use its terms exactly, respect its `_Avoid_` list), `docs/spec/` (brief + 00–10; where they differ the spec wins), tickets under `.scratch/viva/issues/` (acceptance criteria, `## Answer`, `Ruling:`/`Decision:` lines), handoffs under `.scratch/handoffs/`. Get the diff with `git diff <base> <head>` and the commits with `git log --oneline <base>..<head>`; read the files at `<head>` with `git show <head>:<path>` (the working tree has moved on since). Explore surrounding code broadly for the Background.

Make a rich, interactive explanation with these sections:
- **Background**: the existing system relevant to this change. A deep background for beginners (marked as skippable if already familiar), then a narrower background directly relevant to the change.
- **Intuition**: the core intuition, the essence rather than the full details. Concrete examples with toy data (the bootcamp fixtures, e.g. `sumRange`, are ideal). Figures and diagrams liberally.
- **Code**: a high-level walkthrough of the changes, grouped and ordered so it's understandable.
- **Defending it** (added for Hatim): the likely hard questions a judge could ask about this PR, each with a short, honest answer grounded in the code, specs, tickets, and rulings, including known gaps and what was deliberately deferred.
- **Quiz**: five medium-difficulty multiple-choice questions that need real understanding of the PR's substance (not gotchas). Interactive: clicking an option says whether it's correct and gives feedback.

Format:
- One self-contained HTML file, CSS and JavaScript inline, no external resources (no CDNs, no web fonts). One long page with section headers and a table of contents; no tabs for the top-level structure. Basic responsive styling for phones. Support light and dark (`prefers-color-scheme`).
- Write with the clarity and flow of Martin Kleppmann, in classic style: engaging, smooth transitions between sections.
- Diagrams: pick a small number of diagram families and reuse them (e.g. a simplified mock of the UI the student sees; a system/data-flow diagram with example data). Simple HTML/CSS (or inline SVG) only; never ASCII diagrams. HTML lists for lists. Callouts for key concepts, definitions, and edge cases.
- Code blocks: always `<pre>`. If you style a custom block instead, it must have `white-space: pre-wrap`. Before saving, scan every code block in the source and confirm its CSS has `white-space: pre` or `pre-wrap`. Escape `<`, `>`, `&` inside code.
- Save outside the repo (a scratch or `/tmp` path the reader can open), named `YYYY-MM-DD-explanation-pr-<N>-<slug>.html`.

Verify before reporting (in a multi-agent session, avoid the shared Playwright browser): parse the file with Python's `html.parser` (no errors), extract the inline `<script>` and run `node --check` on it, and confirm every quiz question has exactly one correct option wired to feedback. Report back in 5 lines or fewer: the file path(s), size, section list, and anything you couldn't verify.
