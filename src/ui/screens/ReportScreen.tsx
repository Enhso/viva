import { CALIBRATION_BUCKETS, type Report } from "../../grading";
import { MutantCode } from "../CodeBlock";
import { useT } from "../strings";
import { Tier2 } from "../Tier2";

// Ticket 19's report: summary, then the four calibration buckets, each grouped by taxonomy label
// (exact text; ticket 22 adds same-concept grouping). Confidently wrong alone re-shows the
// mutated code and gets a synthesized connecting line per label group (07 §5). Every Tier 2
// element — the label itself, and the connecting line it names — renders through <Tier2>, whose
// real hedge treatment is ticket 21's call.
export function ReportScreen({ report, onRestart }: { report: Report; onRestart: () => void }) {
  const t = useT();
  const confidentlyWrongCount = report.bucketCounts["confidently-wrong"];

  return (
    <section className="screen">
      <h2>{t("report.heading")}</h2>
      {report.fallback && <p className="muted report__fallback-note">{t("report.fallbackNote")}</p>}

      <section className="report-summary">
        <ul className="buckets">
          {CALIBRATION_BUCKETS.map((bucket) => (
            <li key={bucket} className="bucket" data-bucket={bucket}>
              <span className="bucket__count">{report.bucketCounts[bucket]}</span>
              <span className="bucket__name">{t(`report.bucket.${bucket}`)}</span>
            </li>
          ))}
        </ul>
        {report.meanBrier !== null && (
          <p className="report-summary__brier">{t("report.summary.brier", { brier: report.meanBrier.toFixed(3) })}</p>
        )}
        <p className="report-summary__pointer">
          {confidentlyWrongCount > 0 ? t("report.summary.pointer") : t("report.summary.congrats")}
        </p>
      </section>

      {report.buckets.map((bucketReport) => {
        if (bucketReport.count === 0) return null;
        const isConfidentlyWrong = bucketReport.bucket === "confidently-wrong";
        return (
          <section key={bucketReport.bucket} className="bucket-entries" data-bucket={bucketReport.bucket}>
            <h3>{t(`report.bucket.${bucketReport.bucket}`)}</h3>
            {bucketReport.groups.map((group, groupIndex) => (
              <div key={groupIndex} className="label-group">
                <h4 className="label-group__label">
                  {group.label === null ? t("report.unlabelled") : <Tier2>{group.label}</Tier2>}
                </h4>
                {group.connectingLine !== null && (
                  <p className="label-group__connecting-line">
                    <Tier2>{group.connectingLine}</Tier2>
                  </p>
                )}
                {group.entries.map((entry, entryIndex) => (
                  <article key={entryIndex} className="entry">
                    <h5 className="entry__heading">
                      {t("report.change", { from: entry.change.from, to: entry.change.to, rule: t(`rule.${entry.change.rule}`) })}
                    </h5>
                    {isConfidentlyWrong && <MutantCode beat={entry.beat} />}
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
              </div>
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
