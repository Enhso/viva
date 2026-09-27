// GitHub REST calls Viva makes on the student's behalf, directly from the browser (GitHub's API
// allows CORS from any origin for token-authenticated requests, so no server proxy is needed).
// Every call here is a GET: read the repo list, its default-branch tree, and blob contents.
// Ticket 23's "no write call to GitHub exists anywhere in the code" holds by construction — this
// is the only module that talks to the GitHub API, and it has no POST/PATCH/PUT/DELETE.
const API_BASE = "https://api.github.com";

async function githubGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`api.github.com ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export interface GithubRepo {
  fullName: string;
  owner: string;
  name: string;
  defaultBranch: string;
  private: boolean;
  pushedAt: string;
}

/** Most-recently-pushed first (01 §3), respecting whichever scope's token is passed. */
export async function listRepos(token: string): Promise<GithubRepo[]> {
  const repos = await githubGet<
    { full_name: string; owner: { login: string }; name: string; default_branch: string; private: boolean; pushed_at: string }[]
  >("/user/repos?sort=pushed&direction=desc&per_page=100", token);
  return repos.map((repo) => ({
    fullName: repo.full_name,
    owner: repo.owner.login,
    name: repo.name,
    defaultBranch: repo.default_branch,
    private: repo.private,
    pushedAt: repo.pushed_at,
  }));
}

export interface RepoTree {
  entries: { path: string; type: string; sha: string }[];
}

/** The tree at the latest commit on the repo's default branch (01 §4: no commit picker, ever). */
export async function fetchDefaultBranchTree(token: string, owner: string, repo: string, defaultBranch: string): Promise<RepoTree> {
  const branch = await githubGet<{ commit: { sha: string } }>(
    `/repos/${owner}/${repo}/branches/${encodeURIComponent(defaultBranch)}`,
    token,
  );
  const tree = await githubGet<{ tree: { path: string; type: string; sha: string }[]; truncated: boolean }>(
    `/repos/${owner}/${repo}/git/trees/${branch.commit.sha}?recursive=1`,
    token,
  );
  return { entries: tree.tree };
}

/** A blob's raw text content, decoded from GitHub's base64 encoding. */
export async function fetchBlobText(token: string, owner: string, repo: string, sha: string): Promise<string> {
  const blob = await githubGet<{ content: string; encoding: string }>(`/repos/${owner}/${repo}/git/blobs/${sha}`, token);
  if (blob.encoding !== "base64") throw new Error(`unexpected blob encoding: ${blob.encoding}`);
  return atob(blob.content.replace(/\n/g, ""));
}
