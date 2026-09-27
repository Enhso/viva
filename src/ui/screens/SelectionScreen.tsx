import { Fragment, useMemo, useState } from "react";
import { estimateBeatCount, orderByComplexity, BEATS_PER_MUTANT, MUTANTS_PER_FUNCTION } from "../../engine";
import { DEMO_FIXTURES, REJECTED_FIXTURES, type DemoFixture, type ScopeRejectionReason } from "../demo-fixtures";
import { LANGUAGE_NAME, useT, VISIBLE_LANGUAGES, type Language } from "../strings";

interface OrderedFixture {
  fixture: DemoFixture;
  score: number;
}

/**
 * The eligible corpus's DemoFixture shape carries what `orderByComplexity` (02 §2) needs — a
 * name and source text — under different field names. This adapts one to the other and matches
 * results back up by name+source (never by array position, which a tie could reorder).
 */
function orderFixtures(fixtures: DemoFixture[]): OrderedFixture[] {
  const asEligible = fixtures.map((fixture) => ({
    name: fixture.functionName,
    params: [],
    signature: fixture.signature,
    source: fixture.source,
    docstring: fixture.docstring,
  }));
  return orderByComplexity(asEligible).map((entry) => {
    const fixture = fixtures.find((f) => f.functionName === entry.fn.name && f.source === entry.fn.source);
    if (!fixture) throw new Error(`orderByComplexity returned an unknown function: ${entry.fn.name}`);
    return { fixture, score: entry.score };
  });
}

export interface RejectedEntry {
  path: string;
  name: string;
  /** A reason code; its words come from the string table (`scope.<reason>`, ticket 24). */
  reason: ScopeRejectionReason | "not-eligible-file";
}

const DEFAULT_REJECTED: RejectedEntry[] = REJECTED_FIXTURES;

/**
 * Ticket 23: the demo corpus and a connected GitHub repo are two interchangeable sources for
 * this same screen ("keep the demo fixtures available alongside a connected repo") — the caller
 * (`App.tsx`, the ingestion entry point) picks which one is live and passes its fixtures/rejected
 * list plus a label for the source heading. Omitting these keeps the screen's original demo-only
 * behavior.
 */
export function SelectionScreen({
  loading,
  onStart,
  language,
  onLanguageChange,
  fixtures = DEMO_FIXTURES,
  rejected = DEFAULT_REJECTED,
  sourceLabel,
  sourceNote,
}: {
  loading: boolean;
  onStart: (selected: DemoFixture[]) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  fixtures?: DemoFixture[];
  rejected?: RejectedEntry[];
  sourceLabel?: string;
  sourceNote?: string;
}) {
  const t = useT();
  const ordered = useMemo(() => orderFixtures(fixtures), [fixtures]);
  const total = ordered.length;
  const [n, setN] = useState(() => Math.min(3, total));

  const beatEstimate = estimateBeatCount(n);

  return (
    <section className="screen">
      <p className="lede">{t("app.tagline")}</p>

      <fieldset className="language-picker">
        <legend>{t("selection.language.heading")}</legend>
        {VISIBLE_LANGUAGES.map((code) => (
          <label key={code} className="language-picker__option">
            <input
              type="radio"
              name="language"
              value={code}
              checked={language === code}
              disabled={loading}
              onChange={() => onLanguageChange(code)}
            />
            {LANGUAGE_NAME[code]}
          </label>
        ))}
      </fieldset>

      <h2>{t("selection.heading")}</h2>

      <div className="selection-controls">
        <label className="field" htmlFor="selection-n">
          <span className="field__label">{t("selection.n.label", { n: String(n), total: String(total) })}</span>
          <input
            id="selection-n"
            className="field__input"
            type="range"
            min={total > 0 ? 1 : 0}
            max={total}
            value={n}
            disabled={loading || total === 0}
            onChange={(event) => setN(Number(event.target.value))}
          />
        </label>
        <div className="help-box" role="note">
          <p className="help-box__heading">{t("selection.help.heading")}</p>
          <p>
            {t("selection.help.body", {
              mutantsPerFunction: String(MUTANTS_PER_FUNCTION),
              beatsPerMutant: String(BEATS_PER_MUTANT),
              n: String(n),
              estimate: String(beatEstimate),
            })}
          </p>
          <p className="muted help-box__provisional">{t("selection.help.provisional")}</p>
        </div>
      </div>

      <div className="source">
        <h3 className="source__name">{sourceLabel ?? t("start.source.demo")}</h3>
        <p className="muted">{sourceNote ?? t("start.source.demoNote")}</p>
        <ol className="fixture-list">
          {ordered.map(({ fixture, score }, index) => (
            <Fragment key={`${fixture.path}#${fixture.functionName}`}>
              {index === n && <li className="fixture-cutoff">{t("selection.cutoff", { n: String(n) })}</li>}
              <li className="fixture-card">
                <code className="fixture__name">{fixture.signature}</code>
                <span className="fixture__complexity">{t("selection.complexity", { score: String(score) })}</span>
                <span className="fixture__path muted">{fixture.path}</span>
                {fixture.docstring ? (
                  <p className="fixture__doc">{fixture.docstring}</p>
                ) : (
                  <p className="fixture__doc muted">{t("start.noDocstring")}</p>
                )}
              </li>
            </Fragment>
          ))}
          {n === total && total > 0 && <li className="fixture-cutoff">{t("selection.cutoffAll")}</li>}
        </ol>
      </div>

      {rejected.length > 0 && (
        <div className="source">
          <h3 className="source__name">{t("start.rejected.heading")}</h3>
          <ul className="fixture-list">
            {rejected.map((rejection) => (
              <li key={`${rejection.path}#${rejection.name}`} className="fixture fixture--rejected">
                <code className="fixture__name">{rejection.name || rejection.path}</code>
                <span className="fixture__path muted">{rejection.path}</span>
                <span className="fixture__reason">{t("start.rejected.reason", { reason: t(`scope.${rejection.reason}`) })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" disabled={loading || n === 0} onClick={() => onStart(ordered.slice(0, n).map((entry) => entry.fixture))}>
        {t("selection.begin", { n: String(n) })}
      </button>

      {loading && <p className="muted" role="status">{t("start.loading")}</p>}
    </section>
  );
}
