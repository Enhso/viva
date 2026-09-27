import type { ReactNode } from "react";
import { useT } from "./strings";

/**
 * The one component every Tier 2 element (07 §4) renders through — a taxonomy label, and later
 * (ticket 22) its same-concept grouping. Hatim's actual hedge treatment is ticket 21's call; this
 * is a visibly placeholder stand-in so the rule ("structurally different from Tier 1, not softer
 * wording in the same sentence") already holds true, even before his wording lands. Keeping every
 * Tier 2 element behind this one component means his decision changes exactly one place.
 */
export function Tier2({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <span className="tier2" data-pending-ticket="21" title={t("report.tier2Pending")}>
      {children}
      <sup className="tier2__marker" aria-hidden="true">
        †
      </sup>
    </span>
  );
}
