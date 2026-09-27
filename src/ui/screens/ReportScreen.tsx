import { CALIBRATION_BUCKETS, type Report } from "../../grading";
import { useT } from "../strings";

// Ticket 01's report: the four bucket counts and each beat's Tier 1 facts. Ticket 19 builds the full report.
export function ReportScreen({ report, onRestart }: { report: Report; onRestart: () => void }) {
  const t = useT();
  return (
    <section className="screen">
      <h2>{t("report.heading")}</h2>
      <ul className="buckets">
        {CALIBRATION_BUCKETS.map((bucket) => (
          <li key={bucket} className="bucket" data-bucket={bucket}>
            <span className="bucket__count">{report.bucketCounts[bucket]}</span>
            <span className="bucket__name">{t(`report.bucket.${bucket}`)}</span>
          </li>
        ))}
      </ul>
      {CALIBRATION_BUCKETS.map((bucket) => {
        const entries = report.entries.filter((entry) => entry.bucket === bucket);
        if (entries.length === 0) return null;
        return (
          <section key={bucket} className="bucket-entries" data-bucket={bucket}>
            <h3>{t(`report.bucket.${bucket}`)}</h3>
            {entries.map((entry, index) => (
              <article key={index} className="entry">
                <h4 className="entry__heading">
                  {t("report.change", { from: entry.change.from, to: entry.change.to, rule: t(`rule.${entry.change.rule}`) })}
                </h4>
                {entry.taxonomyLabel === null && <p className="entry__no-label muted">{t("report.noLabel")}</p>}
                <p className="entry__fact">
                  {t("report.fact", {
                    call: entry.call,
                    answered: entry.answered,
                    correctAnswer: entry.correctAnswer,
                    confidence: entry.confidence,
                  })}
                </p>
              </article>
            ))}
          </section>
        );
      })}
      <button type="button" onClick={onRestart}>
        {t("report.restart")}
      </button>
    </section>
  );
}
