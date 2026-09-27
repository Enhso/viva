// Darija placeholder (ticket 26 is Hatim's to actually translate). Registered here so the
// N-language registry is real from day one, but every value is still the English text — this
// table is a starting point, not a translation, and it stays hidden from the picker
// (index.ts's VISIBLE_LANGUAGES) until Hatim says otherwise. The key-parity test only checks
// visible languages, so this untranslated copy never fails it.
import { en } from "./en";

export const da: Record<keyof typeof en, string> = { ...en };
