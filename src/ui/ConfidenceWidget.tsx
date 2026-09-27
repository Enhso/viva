import { useState, type ChangeEvent } from "react";
import {
  LEGEND_BUCKETS,
  nudgeTenths,
  percentToTenths,
  sliderStepTenths,
  snapToLegendBucket,
  tenthsToPercent,
} from "./confidence";
import { useT } from "./strings";

// Metaculus-style widget (06 §1-2): slider (1% drag), +/- buttons (0.1% nudge) and a numeric
// box (0.1% direct entry) all bound to one underlying value, plus an optional legend that
// snaps to a representative point on click. The value lives in tenths internally (confidence.ts)
// and is converted to a plain percent only when reported to the parent (06 §3: exact value, no
// rounding, reaches scoring unrounded).
export function ConfidenceWidget({
  valuePercent,
  onChange,
}: {
  valuePercent: number;
  onChange: (percent: number) => void;
}) {
  const t = useT();
  const tenths = percentToTenths(valuePercent);
  // The numeric box's own text, so a student can type "67" without it becoming "67.0" out from
  // under them mid-keystroke; it re-syncs from the committed value on blur or on any other
  // control's change.
  const [boxText, setBoxText] = useState(tenthsToPercent(tenths).toFixed(1));

  function commit(nextTenths: number) {
    const percent = tenthsToPercent(nextTenths);
    setBoxText(percent.toFixed(1));
    onChange(percent);
  }

  function onSlider(event: ChangeEvent<HTMLInputElement>) {
    commit(sliderStepTenths(Number(event.target.value)));
  }

  function onBoxChange(event: ChangeEvent<HTMLInputElement>) {
    setBoxText(event.target.value);
    const parsed = Number(event.target.value);
    if (event.target.value.trim() !== "" && Number.isFinite(parsed)) {
      onChange(tenthsToPercent(percentToTenths(parsed)));
    }
  }

  function onBoxBlur() {
    // Re-sync the box text to the canonical value in case of a partial or out-of-range entry.
    setBoxText(tenthsToPercent(tenths).toFixed(1));
  }

  return (
    <div className="confidence">
      <div className="confidence__control">
        <button
          type="button"
          className="confidence__nudge"
          aria-label={t("confidence.decrement")}
          onClick={() => commit(nudgeTenths(tenths, -1))}
        >
          −
        </button>
        <input
          className="confidence__slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={tenthsToPercent(tenths)}
          onChange={onSlider}
        />
        <button
          type="button"
          className="confidence__nudge"
          aria-label={t("confidence.increment")}
          onClick={() => commit(nudgeTenths(tenths, +1))}
        >
          +
        </button>
      </div>
      <input
        className="field__input field__input--number confidence__box"
        type="number"
        inputMode="decimal"
        min={0}
        max={100}
        step={0.1}
        value={boxText}
        onChange={onBoxChange}
        onBlur={onBoxBlur}
      />
      <ul className="confidence__legend">
        {LEGEND_BUCKETS.map((bucket) => (
          <li key={bucket.id}>
            <button type="button" className="confidence__legend-item" onClick={() => commit(snapToLegendBucket(bucket.id))}>
              {t(bucket.labelKey as Parameters<typeof t>[0])}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
