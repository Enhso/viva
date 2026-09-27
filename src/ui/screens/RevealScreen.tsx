import { renderCall, renderOutput } from "../../engine";
import type { BeatResult } from "../../grading";
import { MutantCode } from "../CodeBlock";
import { describeOutput, useT } from "../strings";

export function RevealScreen({ result, isLast, onNext }: { result: BeatResult; isLast: boolean; onNext: () => void }) {
  const t = useT();
  const { beat } = result;
  return (
    <section className="screen">
      <MutantCode beat={beat} />
      <h2 className="question">
        <code>{t("beat.question", { call: renderCall(beat.function.name, beat.input) })}</code>
      </h2>
      <p className={result.correct ? "verdict verdict--right" : "verdict verdict--wrong"}>
        {t(result.correct ? "reveal.right" : "reveal.wrong")}
      </p>
      <dl className="facts">
        <dt>{t("reveal.predicted")}</dt>
        <dd><code>{result.prediction.trim()}</code></dd>
        <dt>{t("reveal.mutantOutput")}</dt>
        <dd><code>{describeOutput(renderOutput(beat.mutantOutput), t)}</code></dd>
        <dt>{t("reveal.originalOutput")}</dt>
        <dd><code>{describeOutput(renderOutput(beat.originalOutput), t)}</code></dd>
        <dt>{t("reveal.confidence")}</dt>
        <dd>{t("reveal.confidenceValue", { confidence: result.confidence })}</dd>
      </dl>
      <button type="button" onClick={onNext} autoFocus>
        {t(isLast ? "reveal.toReport" : "reveal.next")}
      </button>
    </section>
  );
}
