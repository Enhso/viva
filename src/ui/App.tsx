import { useEffect, useReducer, useRef } from "react";
import { runFallbackViva, type Viva, type VivaMode } from "../engine";
import { createWorkerRunner } from "../engine/sandbox/worker-runner";
import { buildReport, gradeBeat, type BeatResult } from "../grading";
import type { DemoFixture } from "./demo-fixtures";
import { ModeIndicator } from "./ModeIndicator";
import { BeatScreen } from "./screens/BeatScreen";
import { ReportScreen } from "./screens/ReportScreen";
import { RevealScreen } from "./screens/RevealScreen";
import { StartScreen } from "./screens/StartScreen";
import { LanguageContext, useT } from "./strings";

type State =
  | { screen: "start"; loading: boolean }
  | { screen: "beat"; viva: Viva; results: BeatResult[] }
  | { screen: "reveal"; viva: Viva; results: BeatResult[] }
  | { screen: "report"; viva: Viva; results: BeatResult[] }
  | { screen: "error"; message: string };

type Action =
  | { type: "load" }
  | { type: "loaded"; viva: Viva }
  | { type: "failed"; message: string }
  | { type: "answer"; prediction: string; confidence: number }
  | { type: "next" }
  | { type: "restart" };

function reduce(state: State, action: Action): State {
  switch (action.type) {
    case "load":
      return { screen: "start", loading: true };
    case "loaded":
      return { screen: "beat", viva: action.viva, results: [] };
    case "failed":
      return { screen: "error", message: action.message };
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

// No provider chain exists yet (ticket 06), so every viva runs in fallback mode.
const MODE: VivaMode = "fallback";

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
  const runner = useRef<ReturnType<typeof createWorkerRunner> | null>(null);
  useEffect(() => () => runner.current?.dispose(), []);
  useEffect(() => {
    document.title = t("app.title");
  }, [t]);

  async function start(fixture: DemoFixture) {
    dispatch({ type: "load" });
    runner.current ??= createWorkerRunner();
    try {
      const viva = await runFallbackViva({ source: fixture.source, functionName: fixture.functionName }, runner.current);
      if (viva.beats.length === 0) dispatch({ type: "failed", message: t("error.noMutant", { name: fixture.functionName }) });
      else dispatch({ type: "loaded", viva });
    } catch (error) {
      dispatch({ type: "failed", message: t("error.failed", { message: String(error) }) });
    }
  }

  return (
    <div className="shell" data-mode={MODE}>
      <ModeIndicator mode={MODE} />
      <main className="page">
        <h1 className="brand">{t("app.title")}</h1>
        {state.screen === "start" && <StartScreen loading={state.loading} onStart={start} />}
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
