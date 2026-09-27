import { DEMO_FIXTURES, REJECTED_FIXTURES, SCOPE_REASON_LABEL, type DemoFixture } from "../demo-fixtures";
import { useT } from "../strings";

export function StartScreen({ loading, onStart }: { loading: boolean; onStart: (fixture: DemoFixture) => void }) {
  const t = useT();
  return (
    <section className="screen">
      <p className="lede">{t("app.tagline")}</p>
      <h2>{t("start.heading")}</h2>
      <div className="source">
        <h3 className="source__name">{t("start.source.demo")}</h3>
        <p className="muted">{t("start.source.demoNote")}</p>
        <ul className="fixture-list">
          {DEMO_FIXTURES.map((fixture) => (
            <li key={`${fixture.path}#${fixture.functionName}`} className="fixture">
              <code className="fixture__name">{fixture.signature}</code>
              <span className="fixture__path muted">{fixture.path}</span>
              {fixture.docstring ? (
                <p className="fixture__doc">{fixture.docstring}</p>
              ) : (
                <p className="fixture__doc muted">{t("start.noDocstring")}</p>
              )}
              <button type="button" disabled={loading} onClick={() => onStart(fixture)}>
                {t("start.begin")}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {REJECTED_FIXTURES.length > 0 && (
        <div className="source">
          <h3 className="source__name">{t("start.rejected.heading")}</h3>
          <ul className="fixture-list">
            {REJECTED_FIXTURES.map((rejection) => (
              <li key={`${rejection.path}#${rejection.name}`} className="fixture fixture--rejected">
                <code className="fixture__name">{rejection.name || rejection.path}</code>
                <span className="fixture__path muted">{rejection.path}</span>
                <span className="fixture__reason">{t("start.rejected.reason", { reason: SCOPE_REASON_LABEL[rejection.reason] })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {loading && <p className="muted" role="status">{t("start.loading")}</p>}
    </section>
  );
}
