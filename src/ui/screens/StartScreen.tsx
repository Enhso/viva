import { DEMO_FIXTURES, type DemoFixture } from "../demo-fixtures";
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
            <li key={fixture.path} className="fixture">
              <code className="fixture__name">{fixture.functionName}</code>
              <span className="fixture__path muted">{fixture.path}</span>
              <button type="button" disabled={loading} onClick={() => onStart(fixture)}>
                {t("start.begin")}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {loading && <p className="muted" role="status">{t("start.loading")}</p>}
    </section>
  );
}
