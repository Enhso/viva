import type { VivaMode } from "../engine";
import { useT } from "./strings";

export interface ModeIndicatorProps {
  /** "pending": before any viva runs, the strip claims no mode. */
  mode: VivaMode | "pending";
  /** live/cached: which provider and model served this viva (03 §5, ticket 06). fallback: the
   *  model that judged the candidates when fallback came after a served filter call. */
  provider?: string;
  model?: string;
  /** fallback only: why every provider failed, or why fallback ran on purpose (03 §6). */
  reason?: string;
}

/** The one mode indicator (09 §4). The app shell renders it, so no screen can leave it out. */
export function ModeIndicator({ mode, provider, model, reason }: ModeIndicatorProps) {
  const t = useT();
  const detail =
    provider && model
      ? mode === "fallback"
        ? t("mode.fallback.detailAfterModel", { provider, model })
        : mode === "pending"
          ? t("mode.pending.detail")
          : t(`mode.${mode}.detailWithProvider`, { provider, model })
      : t(`mode.${mode}.detail`);
  return (
    <div className="mode-strip" role="note" data-mode={mode}>
      <strong className="mode-strip__label">{t(`mode.${mode}.label`)}</strong>
      <span className="mode-strip__detail">{detail}</span>
      {mode === "fallback" && reason && <span className="mode-strip__reason">{t("mode.fallback.reason", { reason })}</span>}
    </div>
  );
}
