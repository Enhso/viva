import { useRef, useState, type ChangeEvent } from "react";
import {
  LEGEND_BUCKETS,
  nudgeTenths,
  percentToTenths,
  sliderStepTenths,
  snapToLegendBucket,
  tenthsToPercent,
  parseBoxEntry,
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
  labelledBy,
  describedBy,
}: {
  valuePercent: number;
  onChange: (percent: number) => void;
  /** Id of the visible label that names the slider and the box (they share one value). */
  labelledBy?: string;
  describedBy?: string;
}) {
  const t = useT();
  // While the box holds an invalid entry (valuePercent is NaN), the slider stays where it was.
  const lastValidTenths = useRef(percentToTenths(Number.isFinite(valuePercent) ? valuePercent : 50));
  if (Number.isFinite(valuePercent)) lastValidTenths.current = percentToTenths(valuePercent);
  const tenths = lastValidTenths.current;
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
    // An entry the widget can't hold exactly reports NaN, which keeps Reveal disabled: the
    // recorded confidence always equals what the box shows (ticket 05), never a rounded cousin.
    onChange(parseBoxEntry(event.target.value) ?? Number.NaN);
  }

  function onBoxBlur() {
    // Tidy a valid entry to one decimal; leave an invalid one visible so the student can fix it.
    if (Number.isFinite(valuePercent)) setBoxText(tenthsToPercent(tenths).toFixed(1));
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
          aria-labelledby={labelledBy}
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
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
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
