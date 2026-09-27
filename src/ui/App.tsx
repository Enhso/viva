import { useEffect, useReducer, useRef, useState } from "react";
import { extractFunctions, generateCandidateMutants, runFallbackViva, runLiveViva, type Beat, type LoadedMutant, type Viva, type VivaMode } from "../engine";
import { createWorkerRunner } from "../engine/sandbox/worker-runner";
import { buildReport, gradeBeat, type BeatResult, type LabelGroupingInput } from "../grading";
import { callFilterApiCached, callGroupLabelsApi } from "../llm/client";
import { clearFilterCache } from "../llm/filter-cache-store";
import type { FallbackReason, FilterOutcome, FilterRequest } from "../llm/types";
import type { IngestResult } from "../github/ingest";
import type { DemoFixture } from "./demo-fixtures";
import { GitHubConnect, type GithubRepo } from "./GitHubConnect";
import { ModeIndicator } from "./ModeIndicator";
import { BeatScreen } from "./screens/BeatScreen";
import { ReportScreen } from "./screens/ReportScreen";
import { RevealScreen } from "./screens/RevealScreen";
import { SelectionScreen } from "./screens/SelectionScreen";
import { LanguageContext, useT, type Language } from "./strings";

type ModeInfo = {
  /** "pending": no viva has run yet, so no mode can be claimed (09 §4). */
  mode: VivaMode | "pending";
  provider?: string;
  model?: string;
  /** Fallback reason codes (ticket 24); the UI maps each through the string table. */
  reason?: FallbackReason[];
  /**
   * Live only: functions that fell back inside a live viva (every loaded mutant was equivalent).
   * Their beats show the fallback strip, since fallback is labelled wherever it appears (09 §4).
   */
  fallback?: { reasonByFunction: Record<string, FallbackReason> };
};

type State =
  | { screen: "start"; loading: boolean }
  | { screen: "beat"; viva: Viva; results: BeatResult[]; modeInfo: ModeInfo }
  | { screen: "reveal"; viva: Viva; results: BeatResult[]; modeInfo: ModeInfo }
  | { screen: "report"; viva: Viva; results: BeatResult[]; modeInfo: ModeInfo }
  | { screen: "error"; message: string; modeInfo: ModeInfo };

type Action =
  | { type: "load" }
  | { type: "loaded"; viva: Viva; modeInfo: ModeInfo }
  | { type: "failed"; message: string; modeInfo: ModeInfo }
  | { type: "answer"; prediction: string; confidence: number }
  | { type: "next" }
  | { type: "restart" };

const IDLE_MODE: ModeInfo = { mode: "pending" };

// Ticket 23: a GitHub repo's ingested functions are the same shape as a DemoFixture, and its
// rejections just need the reason codes turned into the same human-readable label the demo
// corpus already uses (extended with the one reason unique to a fetched tree: a skipped
// dependency/build-output/minified/non-.js path, which never applies to the bundled fixtures).
function reduce(state: State, action: Action): State {
  switch (action.type) {
    case "load":
      return { screen: "start", loading: true };
    case "loaded":
      return { screen: "beat", viva: action.viva, results: [], modeInfo: action.modeInfo };
    case "failed":
      return { screen: "error", message: action.message, modeInfo: action.modeInfo };
    case "answer": {
      if (state.screen !== "beat") return state;
      const beat = state.viva.beats[state.results.length];
      return { ...state, screen: "reveal", results: [...state.results, gradeBeat(beat, action.prediction, action.confidence)] };
    }
    case "next":
      if (state.screen !== "reveal") return state;
      return { ...state, screen: state.results.length < state.viva.beats.length ? "beat" : "report" };
    case "restart":
      return { screen: "start", loading: false };
  }
}

function currentModeInfo(state: State): ModeInfo {
  if (state.screen === "start") return IDLE_MODE;
  const { modeInfo } = state;
  if (modeInfo.fallback && (state.screen === "beat" || state.screen === "reveal")) {
    const beat = state.viva.beats[state.screen === "beat" ? state.results.length : state.results.length - 1];
    const reason = beat ? modeInfo.fallback.reasonByFunction[beat.function.name] : undefined;
    // A model did judge this function's candidates; the strip names it rather than "no model ran".
    if (reason) return { mode: "fallback", reason: [reason], provider: modeInfo.provider, model: modeInfo.model };
  }
  return modeInfo;
}

export default function App() {
  // The chosen language (ticket 24): picked on the selection screen, held through the viva and
  // into the report — a single piece of state at the root, so every descendant (including the
  // report, built once and handed down rather than re-read from context) sees the same choice.
  const [language, setLanguage] = useState<Language>("en");
  return (
    <LanguageContext.Provider value={language}>
      <VivaFlow language={language} onLanguageChange={setLanguage} />
    </LanguageContext.Provider>
  );
}

function VivaFlow({ language, onLanguageChange }: { language: Language; onLanguageChange: (language: Language) => void }) {
  const t = useT();
  const [state, dispatch] = useReducer(reduce, { screen: "start", loading: false });
  // The demo switch (03 §6): forces fallback on purpose, so "kill the key mid-demo" reads as
  // one clearly labelled act, not an unexplained outage.
  const [forceFallback, setForceFallback] = useState(false);
  // Rehearsals can clear the filter-response cache (ticket 14 checkbox); this flag just
  // confirms the click happened, since a cleared cache otherwise has no visible effect until
  // the next viva runs.
  const [cacheCleared, setCacheCleared] = useState(false);
  // Ticket 23: the demo corpus stays available alongside a connected repo — this is which one
  // the selection screen is currently showing, not an exclusive "mode" the student locks into.
  const [githubSource, setGithubSource] = useState<{ repo: GithubRepo; result: IngestResult } | null>(null);
  const runner = useRef<ReturnType<typeof createWorkerRunner> | null>(null);
  useEffect(() => () => runner.current?.dispose(), []);
  useEffect(() => {
    document.title = t("app.title");
  }, [t]);

  // Ticket 22: the same-concept label-grouping call happens once, after the last beat, right
  // before the report renders -- never per-beat, never inside src/grading (the report consumes
  // this as plain data). Null until it resolves; buildReport then just groups by exact label
  // text (its existing default), so the report never waits on this to render.
  const [labelGrouping, setLabelGrouping] = useState<LabelGroupingInput | null>(null);
  const groupedFor = useRef<BeatResult[] | null>(null);
  useEffect(() => {
    if (state.screen !== "report" || groupedFor.current === state.results) return;
    groupedFor.current = state.results;
    const labels = Array.from(new Set(state.results.map((result) => result.beat.mutant.taxonomyLabel).filter((label): label is string => label !== null)));
    if (labels.length === 0) return; // fallback-only viva, or nothing labelled: exact-text default already covers it
    callGroupLabelsApi(labels)
      .then(setLabelGrouping)
      .catch(() => {
        // A network failure here just means the report renders ungrouped (exact-text) rather
        // than a broken viva (07 §6 checklist: the report always renders).
      });
  }, [state]);

  async function start(fixtures: DemoFixture[]) {
    dispatch({ type: "load" });
    runner.current ??= createWorkerRunner();
    try {
      const { viva, modeInfo } = await runViva(fixtures, runner.current, forceFallback);
      if (viva.beats.length === 0) {
        const names = fixtures.map((fixture) => fixture.functionName).join(", ");
        dispatch({ type: "failed", message: t("error.noMutant", { name: names }), modeInfo });
      } else dispatch({ type: "loaded", viva, modeInfo });
    } catch (error) {
      dispatch({ type: "failed", message: t("error.failed", { message: String(error) }), modeInfo: IDLE_MODE });
    }
  }

  const modeInfo = currentModeInfo(state);

  return (
    <div className="shell" data-mode={modeInfo.mode}>
      <ModeIndicator {...modeInfo} />
      <main className="page">
        <h1 className="brand">{t("app.title")}</h1>
        {state.screen === "start" && (
          <>
            <SelectionScreen
              key={githubSource ? githubSource.repo.fullName : "demo"}
              loading={state.loading}
              onStart={start}
              language={language}
              onLanguageChange={onLanguageChange}
              fixtures={githubSource?.result.eligible}
              rejected={githubSource?.result.rejected}
              sourceLabel={githubSource ? t("start.source.github", { repo: githubSource.repo.fullName }) : undefined}
              sourceNote={githubSource ? t("start.source.githubNote", { branch: githubSource.repo.defaultBranch }) : undefined}
            />
            <GitHubConnect onIngested={(repo, result) => setGithubSource({ repo, result })} />
            {githubSource && githubSource.result.eligible.length === 0 && (
              <p className="muted">{t("github.noEligible", { repo: githubSource.repo.fullName })}</p>
            )}
            <div className="rehearsal">
              <label className="force-fallback">
                <input type="checkbox" checked={forceFallback} onChange={(event) => setForceFallback(event.target.checked)} />
                {t("start.forceFallback")}
              </label>
              <button
                type="button"
                className="clear-cache"
                onClick={() => {
                  clearFilterCache();
                  setCacheCleared(true);
                }}
              >
                {t("start.clearCache")}
              </button>
              {cacheCleared && <span className="clear-cache__done">{t("start.clearCacheDone")}</span>}
            </div>
          </>
        )}
        {state.screen === "beat" && (
          <BeatScreen
            key={state.results.length}
            beat={state.viva.beats[state.results.length]}
            onSubmit={(prediction, confidence) => dispatch({ type: "answer", prediction, confidence })}
          />
        )}
        {state.screen === "reveal" && (
          <RevealScreen
            result={state.results[state.results.length - 1]}
            isLast={state.results.length === state.viva.beats.length}
            onNext={() => dispatch({ type: "next" })}
          />
        )}
        {state.screen === "report" && (
          <ReportScreen
            report={buildReport(state.results, state.viva.mode, labelGrouping, language)}
            onRestart={() => {
              setLabelGrouping(null);
              groupedFor.current = null;
              dispatch({ type: "restart" });
            }}
          />
        )}
        {state.screen === "error" && (
          <section className="screen">
            <p className="error">{state.message}</p>
            <button type="button" onClick={() => dispatch({ type: "restart" })}>
              {t("report.restart")}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

/**
 * Ticket 06/08: builds one filter request covering every selected function (06's first
 * criterion — the filter call must cover all selected functions in one call, which is why the
 * selection screen hands off the whole chosen set instead of one function at a time), calls the
 * filter API once, and runs each function's viva on whatever it returns — the loaded mutants
 * (live) or the default path (fallback) — merging the beats into one combined Viva in
 * complexity-score order (08's hand-off criterion: the caller already passed `fixtures` in that
 * order). The engine never imports src/llm (architecture-boundary.test.ts): this orchestration
 * lives in the UI layer instead, exactly as ticket 06 calls for.
 */
async function runViva(
  fixtures: DemoFixture[],
  runner: ReturnType<typeof createWorkerRunner>,
  forceFallback: boolean,
): Promise<{ viva: Viva; modeInfo: ModeInfo }> {
  const entries = fixtures.map((fixture) => {
    const fn = extractFunctions(fixture.source).find((candidate) => candidate.name === fixture.functionName);
    if (!fn) throw new Error(`No function named ${fixture.functionName} in the given source`);
    return { fixture, fn, candidates: generateCandidateMutants(fn) };
  });

  const request: FilterRequest = {
    functions: entries.map(({ fn, candidates }) => ({
      functionId: fn.name,
      name: fn.name,
      source: fn.source,
      docstring: fn.docstring,
      candidates: candidates.map((candidate) => ({
        candidateId: candidate.id,
        rule: candidate.rule,
        rewrite: candidate.rewrite,
        diff: candidate.diff,
      })),
    })),
  };

  // A network-level failure to reach the filter endpoint itself (not a provider failing) still
  // means the viva runs in fallback mode, labelled with why — never a hard error.
  const outcome = await callFilterApiCached(request, { forceFallback }).catch(
    (error): FilterOutcome => ({
      mode: "fallback",
      reason: { code: "filter-endpoint-unreachable", detail: error instanceof Error ? error.message : String(error) },
    }),
  );

  const beats: Beat[] = [];
  let anyServed = false;
  // Why each function that fell back inside a served viva did so (09 §4: the strip says why).
  const fellBack: Record<string, FallbackReason> = {};
  for (const { fixture, fn, candidates } of entries) {
    if (outcome.mode === "live" || outcome.mode === "cached") {
      const loadedForFunction = outcome.result.loaded.filter((c) => c.functionId === fn.name);
      const loadedMutants: LoadedMutant[] = loadedForFunction
        .map((loadedCandidate) => {
          const candidate = candidates.find((c) => c.id === loadedCandidate.candidateId);
          return candidate ? { candidate, taxonomyLabel: loadedCandidate.label } : null;
        })
        .filter((entry): entry is LoadedMutant => entry !== null);

      const liveViva = await runLiveViva({ source: fixture.source, functionName: fixture.functionName }, loadedMutants, runner);
      if (liveViva.beats.length > 0) {
        beats.push(...liveViva.beats);
        anyServed = true;
        continue;
      }
      // The model loaded nothing here, or every mutant it loaded turned out equivalent (03 §2 hands
      // off surviving mutants only): fall back for this function alone rather than leave it empty.
      fellBack[fn.name] = { code: loadedMutants.length === 0 ? "no-mutant-loaded" : "all-mutants-equivalent" };
    }
    const fallbackViva = await runFallbackViva({ source: fixture.source, functionName: fixture.functionName }, runner);
    beats.push(...fallbackViva.beats);
  }

  // Ticket 14: `outcome.mode` is already "live" | "cached" | "fallback" for the whole batch (one
  // filter call covers every selected function, ticket 06), so a served viva's mode passes
  // straight through; only "every loaded mutant was equivalent" downgrades it to fallback.
  const mode: VivaMode = anyServed && (outcome.mode === "live" || outcome.mode === "cached") ? outcome.mode : "fallback";
  const served = outcome.mode === "live" || outcome.mode === "cached" ? outcome : null;
  const modeInfo: ModeInfo =
    mode !== "fallback" && served
      ? {
          mode,
          provider: served.provider,
          model: served.model,
          fallback: Object.keys(fellBack).length > 0 ? { reasonByFunction: fellBack } : undefined,
        }
      : served
        ? // The model ran, but no selected function kept a mutant: fallback, naming who judged.
          { mode: "fallback", provider: served.provider, model: served.model, reason: Object.values(fellBack) }
        : { mode: "fallback", reason: outcome.mode === "fallback" ? [outcome.reason] : [] };
  // TODO(ticket 09 -> UI): surface per-mutant equivalent-drop reasons here once a screen wants them.
  return { viva: { mode, beats, drops: [] }, modeInfo };
}
