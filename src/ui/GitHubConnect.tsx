// Ticket 23: the GitHub path into a viva — connect, list repos, pick one, ingest its latest
// commit. UI code (CLAUDE.md routing) ships without tests; the pieces it calls into
// (src/github/tree-filter.ts, token-store.ts, oauth.ts) carry the unit tests.
import { useEffect, useState } from "react";
import { listRepos, type GithubRepo } from "../github/api";
import { ingestRepo, type IngestResult } from "../github/ingest";
import { githubTokenStore, type GithubScope } from "../github/token-store";
import { useT } from "./strings";

type ConnectState =
  | { step: "disconnected" }
  | { step: "listing"; scope: GithubScope }
  | { step: "picked"; scope: GithubScope; repos: GithubRepo[] }
  | { step: "ingesting"; scope: GithubScope; repos: GithubRepo[]; repo: GithubRepo }
  | { step: "error"; scope: GithubScope; repos: GithubRepo[]; message: string };

export function GitHubConnect({ onIngested }: { onIngested: (repo: GithubRepo, result: IngestResult) => void }) {
  const t = useT();
  const [state, setState] = useState<ConnectState>({ step: "disconnected" });

  // The callback page (`api/auth/callback.ts`) writes the token into sessionStorage and does a
  // full-page navigation back to "/" — this effect picks it up on that first render after either
  // OAuth flow returns.
  useEffect(() => {
    const held = githubTokenStore.getToken();
    if (!held) return;
    setState({ step: "listing", scope: held.scope });
    listRepos(held.token)
      .then((repos) => setState({ step: "picked", scope: held.scope, repos }))
      .catch((error) => setState({ step: "error", scope: held.scope, repos: [], message: String(error) }));
  }, []);

  function connect(scope: GithubScope) {
    window.location.href = `/api/auth/start?scope=${scope}`;
  }

  async function pick(repo: GithubRepo) {
    const held = githubTokenStore.getToken();
    if (!held || state.step !== "picked") return;
    const { scope, repos } = state;
    setState({ step: "ingesting", scope, repos, repo });
    try {
      const result = await ingestRepo(held.token, repo);
      onIngested(repo, result);
    } catch (error) {
      setState({ step: "error", scope, repos, message: String(error) });
    }
  }

  if (state.step === "disconnected") {
    return (
      <div className="source github-connect">
        <button type="button" onClick={() => connect("public_repo")}>
          {t("github.connect")}
        </button>
        <p className="muted">{t("github.connect.note")}</p>
      </div>
    );
  }

  if (state.step === "listing" || state.step === "ingesting") {
    return (
      <div className="source github-connect">
        <p className="muted" role="status">
          {state.step === "listing" ? t("github.repos.loading") : t("github.ingesting")}
        </p>
      </div>
    );
  }

  return (
    <div className="source github-connect">
      <h3 className="source__name">{t("github.repos.heading")}</h3>
      {state.step === "error" && <p className="error">{t("github.error", { message: state.message })}</p>}
      {state.repos.length === 0 ? (
        <p className="muted">{t("github.repos.empty")}</p>
      ) : (
        <ul className="fixture-list">
          {state.repos.map((repo) => (
            <li key={repo.fullName} className="fixture-card">
              <button type="button" className="repo-pick" onClick={() => pick(repo)}>
                {repo.fullName}
                {repo.private && <span className="fixture__path muted"> ({t("github.repos.private")})</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {state.scope === "public_repo" && (
        <>
          <button type="button" onClick={() => connect("repo")}>
            {t("github.connectPrivate")}
          </button>
          <p className="muted">{t("github.connectPrivate.note")}</p>
        </>
      )}
      <button
        type="button"
        onClick={() => {
          githubTokenStore.clear();
          setState({ step: "disconnected" });
        }}
      >
        {t("github.disconnect")}
      </button>
    </div>
  );
}

export type { GithubRepo };
