import { useState, type FormEvent } from "react";
import type { Beat } from "../../engine";
import { MutantCode } from "../CodeBlock";
import { ConfidenceWidget } from "../ConfidenceWidget";
import { beatQuestion, useT } from "../strings";

export function BeatScreen({ beat, onSubmit }: { beat: Beat; onSubmit: (prediction: string, confidence: number) => void }) {
  const t = useT();
  const [prediction, setPrediction] = useState("");
  const [confidence, setConfidence] = useState(50);
  const valid = prediction.trim() !== "" && Number.isFinite(confidence) && confidence >= 0 && confidence <= 100;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid) onSubmit(prediction, confidence);
  }

  return (
    <section className="screen">
      <MutantCode beat={beat} />
      <h2 className="question">
        <code>{beatQuestion(beat, t)}</code>
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
        <div className="field">
          <span className="field__label">{t("beat.confidence.label")}</span>
          <ConfidenceWidget valuePercent={confidence} onChange={setConfidence} />
          <span className="field__hint muted">{t("beat.confidence.hint")}</span>
        </div>
        <button type="submit" disabled={!valid}>
          {t("beat.submit")}
        </button>
      </form>
    </section>
  );
}
