import { useEffect, useReducer, useRef, useState } from "react";
import { extractFunctions, generateCandidateMutants, runFallbackViva, runLiveViva, type Beat, type LoadedMutant, type Viva, type VivaMode } from "../engine";
import { createWorkerRunner } from "../engine/sandbox/worker-runner";
import { buildReport, gradeBeat, type BeatResult } from "../grading";
import { callFilterApiCached } from "../llm/client";
import { clearFilterCache } from "../llm/filter-cache-store";
import type { FilterOutcome, FilterRequest } from "../llm/types";
import type { DemoFixture } from "./demo-fixtures";
import { ModeIndicator } from "./ModeIndicator";
import { BeatScreen } from "./screens/BeatScreen";
import { ReportScreen } from "./screens/ReportScreen";
import { RevealScreen } from "./screens/RevealScreen";
import { SelectionScreen } from "./screens/SelectionScreen";
import { LanguageContext, useT } from "./strings";

type ModeInfo = {
  mode: VivaMode;
  provider?: string;
  model?: string;
  reason?: string;
  /**
   * Live only: functions that fell back inside a live viva (every loaded mutant was equivalent).
   * Their beats show the fallback strip, since fallback is labelled wherever it appears (09 §4).
   */
  fallback?: { functionNames: string[]; reason: string };
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

const IDLE_MODE: ModeInfo = { mode: "fallback" };

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
    if (beat && modeInfo.fallback.functionNames.includes(beat.function.name)) {
      return { mode: "fallback", reason: modeInfo.fallback.reason };
    }
  }
  return modeInfo;
}

export default function App() {
  return (
    <LanguageContext.Provider value="en">
      <VivaFlow />
    </LanguageContext.Provider>
  );
}

function VivaFlow() {
  const t = useT();
  const [state, dispatch] = useReducer(reduce, { screen: "start", loading: false });
  // The demo switch (03 §6): forces fallback on purpose, so "kill the key mid-demo" reads as
  // one clearly labelled act, not an unexplained outage.
  const [forceFallback, setForceFallback] = useState(false);
  // Rehearsals can clear the filter-response cache (ticket 14 checkbox); this flag just
  // confirms the click happened, since a cleared cache otherwise has no visible effect until
  // the next viva runs.
  const [cacheCleared, setCacheCleared] = useState(false);
  const runner = useRef<ReturnType<typeof createWorkerRunner> | null>(null);
  useEffect(() => () => runner.current?.dispose(), []);
  useEffect(() => {
    document.title = t("app.title");
  }, [t]);

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
            <SelectionScreen loading={state.loading} onStart={start} />
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
          <ReportScreen report={buildReport(state.results)} onRestart={() => dispatch({ type: "restart" })} />
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
      reason: `could not reach the filter endpoint: ${error instanceof Error ? error.message : String(error)}`,
    }),
  );

  const beats: Beat[] = [];
  let anyServed = false;
  const fellBack: string[] = [];
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
      // Every loaded mutant of this function turned out equivalent (03 §2 hands off surviving
      // mutants only) — fall back for this function alone rather than leave it with nothing.
      fellBack.push(fn.name);
    }
    const fallbackViva = await runFallbackViva({ source: fixture.source, functionName: fixture.functionName }, runner);
    beats.push(...fallbackViva.beats);
  }

  // Ticket 14: `outcome.mode` is already "live" | "cached" | "fallback" for the whole batch (one
  // filter call covers every selected function, ticket 06), so a served viva's mode passes
  // straight through; only "every loaded mutant was equivalent" downgrades it to fallback.
  const mode: VivaMode = anyServed && (outcome.mode === "live" || outcome.mode === "cached") ? outcome.mode : "fallback";
  const equivalentReason = "no loaded mutant of this function changed its output";
  const reason = outcome.mode === "fallback" ? outcome.reason : equivalentReason;
  const modeInfo: ModeInfo =
    mode !== "fallback" && (outcome.mode === "live" || outcome.mode === "cached")
      ? {
          mode,
          provider: outcome.provider,
          model: outcome.model,
          fallback: fellBack.length > 0 ? { functionNames: fellBack, reason: equivalentReason } : undefined,
        }
      : { mode: "fallback", reason };
  // TODO(ticket 09 -> UI): surface per-mutant equivalent-drop reasons here once a screen wants them.
  return { viva: { mode, beats, drops: [] }, modeInfo };
}
