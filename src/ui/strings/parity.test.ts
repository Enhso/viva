// Ticket 24: from this ticket on, any ticket adding a string key adds it to every visible
// language. Darija (ticket 26, hidden from the picker) is registered but exempt — the
// `satisfies` clause in index.ts already forces it to carry every key too, so this test is
// specifically about the *visible* set the checkbox names.
import { describe, expect, it } from "vitest";
import { da } from "./da";
import { en } from "./en";
import { fr } from "./fr";
import { LANGUAGE_NAME, VISIBLE_LANGUAGES, type Language } from "./index";

const TABLES: Record<Language, Record<string, string>> = { en, fr, da };

describe("string table key parity", () => {
  const enKeys = Object.keys(en).sort();

  it.each(VISIBLE_LANGUAGES)("%s has exactly the English table's keys", (language) => {
    expect(Object.keys(TABLES[language]).sort()).toEqual(enKeys);
  });

  it("every visible language has a non-empty value for every key", () => {
    for (const language of VISIBLE_LANGUAGES) {
      for (const key of enKeys) {
        expect(TABLES[language][key], `${language}.${key}`).toBeTruthy();
      }
    }
  });

  it("Darija is registered (same keys as English) but hidden from the picker", () => {
    expect(Object.keys(da).sort()).toEqual(enKeys);
    expect(VISIBLE_LANGUAGES).not.toContain("da");
  });

  it("every visible language has an endonym for the picker", () => {
    for (const language of VISIBLE_LANGUAGES) {
      expect(LANGUAGE_NAME[language]).toBeTruthy();
    }
  });
});
