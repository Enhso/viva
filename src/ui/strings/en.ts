// English static chrome (08 §2). Every visible string lives here; ticket 24 adds French beside it.
// Placeholders are {name}; translate() fills them.
export const en = {
  "app.title": "Viva",
  "app.tagline": "An oral-style exam generated from your own JavaScript.",

  "mode.fallback.label": "Fallback mode",
  "mode.fallback.detail":
    "No model ran: default edge-case inputs, the first mutant that changes the output, templated wording.",
  "mode.live.label": "Live",
  "mode.live.detail": "A model chose which mutants to ask about.",
  "mode.live.detailWithProvider": "{provider} ({model}) chose which mutants to ask about.",
  "mode.fallback.reason": "Why: {reason}",
  "mode.fallback.detailAfterModel":
    "{provider} ({model}) judged the candidates, but this uses fallback: default edge-case inputs, the first mutant that changes the output, templated wording.",
  "mode.pending.label": "Mode decided at start",
  "mode.pending.detail": "Live, cached, or fallback is decided when the viva starts; this strip will say which.",
  "mode.cached.label": "Cached",
  "mode.cached.detail": "Replaying a saved model response for this code.",
  "mode.cached.detailWithProvider": "Replaying a saved response from {provider} ({model}) for this code.",

  "start.heading": "Choose code to be examined on",
  "start.forceFallback": "Force fallback mode (demo switch)",
  "start.clearCache": "Clear cached filter responses",
  "start.clearCacheDone": "Cleared — the next viva will call a provider again.",
  "start.source.demo": "Demo fixtures",
  "start.source.demoNote": "Example functions bundled with Viva, not your own repository.",
  "start.source.github": "{repo}",
  "start.source.githubNote": "Latest commit on {branch}.",

  "github.connect": "Connect GitHub",
  "github.connect.note": "Requests read access to your public repositories only.",
  "github.connectPrivate": "Also include private repos",
  "github.connectPrivate.note": "A separate sign-in, requesting GitHub's \"repo\" scope (which also grants write access GitHub doesn't offer a narrower read-only alternative to — Viva never writes).",
  "github.repos.heading": "Pick a repository",
  "github.repos.loading": "Loading your repositories…",
  "github.repos.empty": "No repositories found for the connected account.",
  "github.repos.private": "private",
  "github.ingesting": "Fetching the latest commit and reading its JavaScript…",
  "github.error": "GitHub error: {message}",
  "github.noEligible": "No eligible functions were found in {repo}'s latest commit.",
  "github.disconnect": "Disconnect",
  "start.begin": "Start viva",
  "start.loading": "Running your code and its mutants…",
  "start.noDocstring": "no docstring provided",
  "start.rejected.heading": "Excluded from this corpus",
  "start.rejected.reason": "Excluded: {reason}",

  "selection.heading": "Choose your functions",
  "selection.n.label": "Functions to include: {n} of {total}",
  "selection.complexity": "Complexity score: {score}",
  "selection.cutoff": "↑ included in this viva (top {n}) — not included below ↓",
  "selection.cutoffAll": "↑ every eligible function is included ↓",
  "selection.help.heading": "How long will this be?",
  "selection.help.body":
    "Two dials set viva length: how many functions you include (N), and how many mutants and beats each function contributes (about {mutantsPerFunction} mutants per function, {beatsPerMutant} beats per mutant). At N={n}, expect roughly {estimate} beats.",
  "selection.help.provisional": "The mutants-per-function and beats-per-mutant figures are placeholders, not final.",
  "selection.begin": "Start viva with these {n} functions",

  "beat.question": "{call} → ?",
  // Ticket 17: when the original returns a function, the beat asks about calling it
  // RETURNED_FUNCTION_CALLS times instead of the plain "→ ?" — {count} is that same constant, so
  // this wording can't drift from how many times the sandbox actually calls it.
  "beat.question.returnsFunction": "{call} returns a function; calling it {count} times gives?",
  "beat.prediction.label": "Your prediction",
  "beat.prediction.hint": "A JavaScript value: 42, \"text\", true, null. For an error: throws TypeError.",
  "beat.confidence.label": "Confidence you're right (%)",
  "beat.confidence.hint": "0 to 100, to one decimal place.",
  "beat.submit": "Reveal",

  "confidence.decrement": "Decrease confidence by 0.1%",
  "confidence.increment": "Increase confidence by 0.1%",
  "confidence.legend.guessing": "Guessing",
  "confidence.legend.leaning": "Leaning",
  "confidence.legend.indifferent": "No real belief either way",
  "confidence.legend.fairlySure": "Fairly sure",
  "confidence.legend.certain": "Certain",

  "reveal.right": "Right.",
  "reveal.wrong": "Wrong.",
  "reveal.predicted": "You predicted",
  "reveal.readAs": "Read as",
  "reveal.mutantOutput": "This version returns",
  "reveal.originalOutput": "Your original returns",
  "reveal.confidence": "Your confidence",
  "reveal.confidenceValue": "{confidence}%",
  "reveal.next": "Next",
  "reveal.toReport": "See the report",

  "report.heading": "Report",
  "report.bucket.confidently-right": "Confidently right",
  "report.bucket.confidently-wrong": "Confidently wrong",
  "report.bucket.uncertain-right": "Uncertain & right",
  "report.bucket.uncertain-wrong": "Uncertain & wrong",
  "report.change": "Change: {from} → {to} ({rule})",
  "report.unlabelled": "Unlabelled",
  "report.fact": "{call}: answered {answered}, correct answer was {correctAnswer}, confidence was {confidence}%.",
  "report.restart": "Start again",
  "report.fallbackNote": "This viva ran in fallback mode: no model ran, so nothing here carries a taxonomy label.",
  "report.summary.brier": "Mean Brier score: {brier}",
  "report.summary.pointer": "Start with confidently wrong, below — that's where you were sure of something you had backwards.",
  "report.summary.congrats": "Nothing confidently wrong this time — well calibrated.",
  "report.connectingLine": "You got {wrongCount} of {totalCount} {label} questions wrong with over {confidenceFloor}% confidence.",
  "report.tier2Pending": "taxonomy label — treatment pending ticket 21",

  "rule.relational-flip": "relational operator flip",
  "rule.equality-swap": "equality operator swap",
  "rule.logical-flip": "logical operator flip",
  "rule.arithmetic-swap": "arithmetic operator swap",
  "rule.boolean-literal-flip": "boolean literal flip",
  "rule.negation-removal": "negation removed",
  "rule.negation-insertion": "negation inserted",
  "rule.off-by-one-literal": "off-by-one on a literal",
  "rule.return-deletion": "return deleted",
  "rule.loop-bound-change": "loop bound change",

  // Canonical-rendering copy (04 §3): the engine hands back a structured kind (outputs.ts's
  // CanonicalRendering), never these words directly, so this table is the one place they live.
  "output.timeout": "times out",
  "output.error": "throws {errorName}",

  "error.noMutant": "No mutant of {name} changed its output on the default inputs, so there is nothing to ask.",
  "error.failed": "The viva could not run: {message}",
} as const;

export type StringKey = keyof typeof en;
