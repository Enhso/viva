import { useEffect, useReducer, useRef, useState } from "react";
import { extractFunctions, generateCandidateMutants, runFallbackViva, runLiveViva, type LoadedMutant, type Viva, type VivaMode } from "../engine";
import { createWorkerRunner } from "../engine/sandbox/worker-runner";
import { buildReport, gradeBeat, type BeatResult } from "../grading";
import { callFilterApi } from "../llm/client";
import type { FilterApiResponse, FilterRequest } from "../llm/types";
import type { DemoFixture } from "./demo-fixtures";
import { ModeIndicator } from "./ModeIndicator";
import { BeatScreen } from "./screens/BeatScreen";
import { ReportScreen } from "./screens/ReportScreen";
import { RevealScreen } from "./screens/RevealScreen";
import { StartScreen } from "./screens/StartScreen";
import { LanguageContext, useT } from "./strings";

type ModeInfo = { mode: VivaMode; provider?: string; model?: string; reason?: string };

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
  return state.screen === "start" ? IDLE_MODE : state.modeInfo;
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
  const runner = useRef<ReturnType<typeof createWorkerRunner> | null>(null);
  useEffect(() => () => runner.current?.dispose(), []);
  useEffect(() => {
    document.title = t("app.title");
  }, [t]);

  async function start(fixture: DemoFixture) {
    dispatch({ type: "load" });
    runner.current ??= createWorkerRunner();
    try {
      const { viva, modeInfo } = await runViva(fixture, runner.current, forceFallback);
      if (viva.beats.length === 0) dispatch({ type: "failed", message: t("error.noMutant", { name: fixture.functionName }), modeInfo });
      else dispatch({ type: "loaded", viva, modeInfo });
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
            <StartScreen loading={state.loading} onStart={start} />
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
 * Ticket 06: builds the filter request from the mechanically-generated candidates, calls the
 * filter API, and runs the viva on whatever it returns — the loaded mutants (live) or the
 * default path (fallback). The engine never imports src/llm (architecture-boundary.test.ts):
 * this orchestration lives in the UI layer instead, exactly as the ticket calls for.
 */
async function runViva(
  fixture: DemoFixture,
  runner: ReturnType<typeof createWorkerRunner>,
  forceFallback: boolean,
): Promise<{ viva: Viva; modeInfo: ModeInfo }> {
  const fn = extractFunctions(fixture.source).find((candidate) => candidate.name === fixture.functionName);
  if (!fn) throw new Error(`No function named ${fixture.functionName} in the given source`);
  const candidates = generateCandidateMutants(fn);

  const request: FilterRequest = {
    functions: [
      {
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
      },
    ],
  };

  // A network-level failure to reach the filter endpoint itself (not a provider failing) still
  // means the viva runs in fallback mode, labelled with why — never a hard error.
  const outcome = await callFilterApi(request, { forceFallback }).catch(
    (error): FilterApiResponse => ({
      mode: "fallback",
      reason: `could not reach the filter endpoint: ${error instanceof Error ? error.message : String(error)}`,
    }),
  );

  if (outcome.mode === "live") {
    const loadedForFunction = outcome.result.loaded.filter((c) => c.functionId === fn.name);
    const loadedMutants: LoadedMutant[] = loadedForFunction
      .map((loadedCandidate) => {
        const candidate = candidates.find((c) => c.id === loadedCandidate.candidateId);
        return candidate ? { candidate, taxonomyLabel: loadedCandidate.label } : null;
      })
      .filter((entry): entry is LoadedMutant => entry !== null);

    const viva = await runLiveViva({ source: fixture.source, functionName: fixture.functionName }, loadedMutants, runner);
    if (viva.beats.length > 0) {
      return { viva, modeInfo: { mode: "live", provider: outcome.provider, model: outcome.model } };
    }
    // Every loaded mutant turned out equivalent (03 §2 hands off surviving mutants only) — fall
    // back rather than leave the student with nothing to answer.
  }

  const viva = await runFallbackViva({ source: fixture.source, functionName: fixture.functionName }, runner);
  const reason = outcome.mode === "fallback" ? outcome.reason : "no loaded mutant of the selected function changed its output";
  return { viva, modeInfo: { mode: "fallback", reason } };
}
