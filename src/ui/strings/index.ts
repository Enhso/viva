import { createContext, useContext } from "react";
import type { CanonicalRendering } from "../../engine";
import { en, type StringKey } from "./en";

// The language registry (08 §2): adding a language is one table plus one entry here.
const LANGUAGES = { en } satisfies Record<string, Record<StringKey, string>>;

export type Language = keyof typeof LANGUAGES;
export type { StringKey };
export type StringVars = Record<string, string | number>;

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
    case "function":
      return t("output.function");
    case "timeout":
      return t("output.timeout");
    case "error":
      return t("output.error", { errorName: rendering.errorName });
  }
}

export const LanguageContext = createContext<Language>("en");

export function useT(): (key: StringKey, vars?: StringVars) => string {
  const language = useContext(LanguageContext);
  return (key, vars) => translate(language, key, vars);
}
