import { useState, type FormEvent } from "react";
import { renderOutput, type Beat } from "../../engine";
import { MutantCode } from "../CodeBlock";
import { ConfidenceWidget } from "../ConfidenceWidget";
import { beatQuestion, describeOutput, useT } from "../strings";

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
        <div className="field">
          <span className="field__label">{t("beat.prediction.label")}</span>
          {beat.format === "multiple-choice" && beat.options ? (
            <PredictionOptions options={beat.options} value={prediction} onChange={setPrediction} />
          ) : (
            <>
              <input
                className="field__input field__input--code"
                value={prediction}
                onChange={(event) => setPrediction(event.target.value)}
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              <span className="field__hint muted">{t("beat.prediction.hint")}</span>
            </>
          )}
        </div>
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

/**
 * The multiple-choice prediction input (05 §4, ticket 18): options are already shuffled by the
 * engine (multiple-choice.ts) before this ever renders, and rendered in canonical output form
 * (describeOutput/renderOutput, 04 §3) -- picking one submits that same canonical text as the
 * prediction, so grading runs through the exact same path free text does (10's readPrediction +
 * sameOutput), no separate comparison for this format.
 */
function PredictionOptions({
  options,
  value,
  onChange,
}: {
  options: Beat["options"];
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useT();
  return (
    <div className="prediction-options" role="radiogroup">
      {options!.map((option, index) => {
        const text = describeOutput(renderOutput(option), t);
        const selected = value === text;
        return (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={selected}
            className={selected ? "prediction-option prediction-option--selected" : "prediction-option"}
            onClick={() => onChange(text)}
          >
            <code>{text}</code>
          </button>
        );
      })}
    </div>
  );
}
