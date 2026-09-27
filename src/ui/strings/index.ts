import { createContext, useContext } from "react";
import { renderCall, RETURNED_FUNCTION_CALLS, type Beat, type CanonicalRendering } from "../../engine";
import { da } from "./da";
import { en, type StringKey } from "./en";
import { fr } from "./fr";
import type { FallbackReason } from "../../llm/types";

// The language registry (08 §2): adding a language is one table plus one entry here. The
// `satisfies` clause fails typecheck the moment any registered table drops a key the English
// table has — Darija included, even while it's hidden from the picker.
const LANGUAGES = { en, fr, da } satisfies Record<string, Record<StringKey, string>>;

export type Language = keyof typeof LANGUAGES;
export type { StringKey };
export type StringVars = Record<string, string | number>;

/**
 * The languages offered on the picker (ticket 24). Darija is registered above — a genuine
 * N-language table — but stays out of this list until Hatim says otherwise (ticket 26).
 */
export const VISIBLE_LANGUAGES: readonly Language[] = ["en", "fr"];

/** Endonyms: a language's own name for itself, shown on the picker regardless of the current UI
 * language, so this is a plain lookup rather than a string-table key (Ruling, below). */
export const LANGUAGE_NAME: Record<Language, string> = { en: "English", fr: "Français", da: "الدارجة" };

export function translate(language: Language, key: StringKey, vars?: StringVars): string {
  const template: string = LANGUAGES[language][key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : placeholder,
  );
}

/**
 * The one place a `CanonicalRendering` (04's structured, copy-free output shape) becomes text:
 * every word beyond a returned value's own literal spelling comes from the string table.
 */
export function describeOutput(rendering: CanonicalRendering, t: (key: StringKey, vars?: StringVars) => string): string {
  switch (rendering.kind) {
    case "value":
      return rendering.text;
    case "timeout":
      return t("output.timeout");
    case "error":
      return t("output.error", { errorName: rendering.errorName });
  }
}

/**
 * The beat's question heading (05 §1): names what's being predicted, which differs when the
 * original returns a function (ticket 17) — the student predicts the list of results from
 * calling it `RETURNED_FUNCTION_CALLS` times, not the plain "→ ?" every other beat uses.
 */
export function beatQuestion(beat: Beat, t: (key: StringKey, vars?: StringVars) => string): string {
  const call = renderCall(beat.function.name, beat.input);
  if (beat.originalOutput.kind === "returned" && beat.originalOutput.calledReturnedFunction) {
    return t("beat.question.returnsFunction", { call, count: RETURNED_FUNCTION_CALLS });
  }
  return t("beat.question", { call });
}

/**
 * Fallback reason codes (ticket 24) → text: the server and App.tsx both hand back a code (never
 * a hardcoded sentence), plus an optional verbatim detail — a provider's own error text, or a
 * caught error's message — which is never itself translated. Several reasons can apply at once
 * (e.g. one fallback-inside-a-served-viva per function), so this joins them.
 */
export function describeFallbackReasons(reasons: readonly FallbackReason[], t: (key: StringKey, vars?: StringVars) => string): string {
  return reasons
    .map((reason) => {
      const base = t(`fallback.reason.${reason.code}`);
      return reason.detail ? t("fallback.reason.withDetail", { reason: base, detail: reason.detail }) : base;
    })
    .join("; ");
}

export const LanguageContext = createContext<Language>("en");

export function useT(): (key: StringKey, vars?: StringVars) => string {
  const language = useContext(LanguageContext);
  return (key, vars) => translate(language, key, vars);
}
