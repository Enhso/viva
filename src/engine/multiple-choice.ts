import { FIRST_BEAT_FREE_TEXT_WEIGHT, LATER_BEAT_FREE_TEXT_WEIGHT } from "./pacing";
import { sameOutput } from "./outputs";
import type { SandboxRunner } from "./sandbox/types";
import type { RunOutcome } from "./sandbox/types";
import type { AnswerKeyEntry, Beat, BeatFormat, CandidateMutant, EligibleFunction, Input, SurvivingMutant } from "./types";

// Ticket 18 (05 §3-4): free-text/multiple-choice format draw, distractor selection, and the
// position shuffle. All test-first, and all driven by the app's own PRNG (prng.ts) -- never the
// sandbox's own seeded Math.random (that's a different global inside a separate vm/worker
// realm) and never the LLM (05 §4's integrity requirement).

// Fixed seed for every beat-format/shuffle decision (mirrors targeted-search.ts's
// TARGETED_SEARCH_SEED): a viva stays reproducible run to run, and the uniformity tests in
// multiple-choice.test.ts are deterministic. Provisional alongside the pacing weights below --
// ticket 20 owns whether this should instead vary per viva.
export const MULTIPLE_CHOICE_SEED = 0x71c05eed;

// Bound on extra sandbox runs (ticket 18 comments: distractors need every candidate mutant's
// output, including non-surviving ones, which is extra work beyond the answer key itself).
// Ruling: bounded by how many *other* candidates are tried, not by how many distractors are
// found, so a function with many candidates costs at most this many extra runs per
// multiple-choice beat -- never one run per candidate. Candidates are tried in the rule engine's
// own deterministic order (mutate.ts), so which ones get tried is itself reproducible.
export const MAX_DISTRACTOR_CANDIDATES_TRIED = 12;

// Ruling: the option count itself isn't fixed by the spec (05 §4 only fixes where distractors
// come from and that position is shuffled) -- a plumbing default, not a hatim call. Correct
// output + up to 3 distractors keeps the choice legible without over-lengthening a beat.
export const MAX_MULTIPLE_CHOICE_OPTIONS = 4;

/**
 * Weighted-random format draw (05 §3): `draw` in [0, 1) from the app's PRNG, `freeTextWeight`
 * the probability of free-text (pacing.ts's FIRST_/LATER_BEAT_FREE_TEXT_WEIGHT).
 *
 * Ruling: a "function"/"timeout" correct output can never be offered as multiple-choice. Its
 * canonical text ("a function" / "times out", strings/index.ts) isn't one of the literal shapes
 * 10's `readPrediction` reads back into that same RunOutcome kind -- it falls through to a bare
 * string, so even picking the *correct* option would be graded wrong. Free-text has no such gap
 * (it already round-trips values and "throws X" errors), so it's always the safe fallback here.
 */
export function chooseBeatFormat(freeTextWeight: number, draw: number, correctOutput: RunOutcome): BeatFormat {
  if (correctOutput.kind === "returnedFunction" || correctOutput.kind === "timeout") return "free-text";
  return draw < freeTextWeight ? "free-text" : "multiple-choice";
}

export interface DistractorSource {
  runner: SandboxRunner;
  fn: EligibleFunction;
  input: Input;
  /** Every candidate mutant of this function other than the one this beat is asking about. */
  otherCandidates: CandidateMutant[];
}

/**
 * Other candidate mutants' real outputs on this beat's input (05 §4): never generated,
 * heuristically invented, or LLM-proposed. Bounded (MAX_DISTRACTOR_CANDIDATES_TRIED extra
 * sandbox runs) and de-duplicated against the correct output and against each other, using 04's
 * output equality -- ticket 18's comments note another candidate's output on a distinguishing
 * input often equals the *original's* output, which is still a genuine, distinct wrong answer
 * and stays eligible as a distractor.
 */
export async function collectDistractorOutputs(
  { runner, fn, input, otherCandidates }: DistractorSource,
  correctOutput: RunOutcome,
): Promise<RunOutcome[]> {
  const distractors: RunOutcome[] = [];
  for (const candidate of otherCandidates.slice(0, MAX_DISTRACTOR_CANDIDATES_TRIED)) {
    if (distractors.length >= MAX_MULTIPLE_CHOICE_OPTIONS - 1) break;
    const output = await runner.run({ source: candidate.source, functionName: fn.name, input });
    if (output.kind === "timeout") continue; // never a predictable answer (ticket 04 R3)
    if (sameOutput(output, correctOutput)) continue;
    if (distractors.some((existing) => sameOutput(existing, output))) continue;
    distractors.push(output);
  }
  return distractors;
}

export interface ShuffledOptions {
  options: RunOutcome[];
  correctIndex: number;
}

/**
 * Shuffles the correct output's position among the given distractors (05 §4) using the given
 * PRNG draw function -- the *only* place a position is chosen, so an LLM never places anything.
 * Returns null when there are no distractors: the ticket's "none at all falls back to free text".
 */
export function shuffleOptions(correctOutput: RunOutcome, distractors: RunOutcome[], random: () => number): ShuffledOptions | null {
  if (distractors.length === 0) return null;
  const options = [correctOutput, ...distractors];
  // Fisher-Yates.
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, correctIndex: options.indexOf(correctOutput) };
}

/**
 * Turns one mutant's (already-capped-to-K) answer-key entries into beats (05 §1-2, ticket 16),
 * deciding each beat's format (05 §3: first beat heavily free-text, later beats closer to even,
 * pacing.ts's weights) and, for a multiple-choice draw, its distractor options (05 §4). Shared by
 * fallback.ts and live.ts so both modes build beats the same way. `otherCandidates` must exclude
 * `mutant` itself, and one `random` draw function is threaded through in order (format draw,
 * then, only when multiple-choice was picked, the shuffle's own draws) so a single seeded PRNG
 * instance (MULTIPLE_CHOICE_SEED) makes a whole viva's format/shuffle choices reproducible.
 */
export async function buildBeatsForMutant(
  fn: EligibleFunction,
  mutant: SurvivingMutant,
  entries: AnswerKeyEntry[],
  otherCandidates: CandidateMutant[],
  runner: SandboxRunner,
  random: () => number,
): Promise<Beat[]> {
  const beats: Beat[] = [];
  for (const [index, entry] of entries.entries()) {
    const freeTextWeight = index === 0 ? FIRST_BEAT_FREE_TEXT_WEIGHT : LATER_BEAT_FREE_TEXT_WEIGHT;
    const draw = random();
    let options: RunOutcome[] | undefined;
    let correctOptionIndex: number | undefined;
    if (chooseBeatFormat(freeTextWeight, draw, entry.mutantOutput) === "multiple-choice") {
      const distractors = await collectDistractorOutputs({ runner, fn, input: entry.input, otherCandidates }, entry.mutantOutput);
      const shuffled = shuffleOptions(entry.mutantOutput, distractors, random);
      if (shuffled) {
        options = shuffled.options;
        correctOptionIndex = shuffled.correctIndex;
      }
      // shuffled === null: no distinct distractor was found -- the ticket's "none at all falls
      // back to free text" (format stays "free-text" below since options is still undefined).
    }
    const format: BeatFormat = options ? "multiple-choice" : "free-text";
    beats.push({ id: `${mutant.id}#${index}`, function: fn, mutant, ...entry, format, options, correctOptionIndex });
  }
  return beats;
}
