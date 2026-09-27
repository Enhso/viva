import type { VivaMode } from "../engine";
import { useT } from "./strings";

/** The one mode indicator (09 §4). The app shell renders it, so no screen can leave it out. */
export function ModeIndicator({ mode }: { mode: VivaMode }) {
  const t = useT();
  return (
    <div className="mode-strip" role="note" data-mode={mode}>
      <strong className="mode-strip__label">{t(`mode.${mode}.label`)}</strong>
      <span className="mode-strip__detail">{t(`mode.${mode}.detail`)}</span>
    </div>
  );
}
