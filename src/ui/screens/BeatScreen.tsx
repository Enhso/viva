import { useState, type FormEvent } from "react";
import { renderCall, type Beat } from "../../engine";
import { MutantCode } from "../CodeBlock";
import { useT } from "../strings";

// A plain number box for now; ticket 05 replaces it with the confidence widget.
// 0–100 with at most one decimal, checked on the text so no float arithmetic touches the value.
const CONFIDENCE_PATTERN = /^(100(\.0)?|\d{1,2}(\.\d)?)$/;

export function BeatScreen({ beat, onSubmit }: { beat: Beat; onSubmit: (prediction: string, confidence: number) => void }) {
  const t = useT();
  const [prediction, setPrediction] = useState("");
  const [confidence, setConfidence] = useState("");
  const valid = prediction.trim() !== "" && CONFIDENCE_PATTERN.test(confidence.trim());

  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid) onSubmit(prediction, Number(confidence.trim()));
  }

  return (
    <section className="screen">
      <MutantCode beat={beat} />
      <h2 className="question">
        <code>{t("beat.question", { call: renderCall(beat.function.name, beat.input) })}</code>
      </h2>
      <form className="answer" onSubmit={submit}>
        <label className="field">
          <span className="field__label">{t("beat.prediction.label")}</span>
          <input
            className="field__input field__input--code"
            value={prediction}
            onChange={(event) => setPrediction(event.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <span className="field__hint muted">{t("beat.prediction.hint")}</span>
        </label>
        <label className="field">
          <span className="field__label">{t("beat.confidence.label")}</span>
          <input
            className="field__input field__input--number"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.1}
            value={confidence}
            onChange={(event) => setConfidence(event.target.value)}
          />
          <span className="field__hint muted">{t("beat.confidence.hint")}</span>
        </label>
        <button type="submit" disabled={!valid}>
          {t("beat.submit")}
        </button>
      </form>
    </section>
  );
}
