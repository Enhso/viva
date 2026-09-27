// The token-holding mechanism (ticket 23 checkbox: no per-student state persists beyond what the
// session needs to hold the token).
//
// Ruling: `sessionStorage`, not a cookie or any server-side session store. It survives the
// redirect round-trip through GitHub's OAuth callback (a fresh in-memory variable would not: the
// callback response is a full-page navigation, not a fetch, so anything held only in a JS
// variable is gone before the app's own code runs again) and it disappears on its own once the
// tab closes — no explicit "log out" or cleanup step needed, and nothing is ever written to
// `localStorage` or a cookie that would outlive the tab. Cost if wrong: a student who leaves the
// tab open indefinitely keeps holding their token in that tab only, never shared across tabs or
// devices — no worse than staying signed into any other site.
//
// Storage is injected so this is testable without a browser (`StorageLike` is the exact slice of
// the `Storage` interface used); the browser entry point below wires the real `sessionStorage`.
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type GithubScope = "public_repo" | "repo";

interface StoredToken {
  token: string;
  scope: GithubScope;
}

/** Exported so `api/auth/callback.ts` can write the same key into the page it hands back to the browser. */
export const STORAGE_KEY = "viva.github.token";

export class TokenStore {
  #storage: StorageLike;

  constructor(storage: StorageLike) {
    this.#storage = storage;
  }

  /** The second OAuth flow (`repo`) is a strict upgrade over the first (`public_repo`): storing its token overwrites any narrower one held for the same session. */
  setToken(token: string, scope: GithubScope): void {
    this.#storage.setItem(STORAGE_KEY, JSON.stringify({ token, scope } satisfies StoredToken));
  }

  getToken(): StoredToken | null {
    const raw = this.#storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as StoredToken;
      return typeof parsed.token === "string" && (parsed.scope === "public_repo" || parsed.scope === "repo") ? parsed : null;
    } catch {
      return null;
    }
  }

  clear(): void {
    this.#storage.removeItem(STORAGE_KEY);
  }
}

// In-memory fallback for a context with no `sessionStorage` (a non-browser test, or a browser
// with site data blocked) — the mechanism degrades to "holds for this page load" rather than
// throwing.
function inMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

function browserSessionStorage(): StorageLike | null {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
}

/** The store the app actually uses: real `sessionStorage` when available, else the in-memory fallback. */
export const githubTokenStore = new TokenStore(browserSessionStorage() ?? inMemoryStorage());
