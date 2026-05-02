export interface StatusCheckParams {
  owner: string;
  repo: string;
  sha: string;
  token: string;
  aiPct: number;
  unreviewedCount: number;
}

export async function createStatusCheck(params: StatusCheckParams): Promise<void> {
  const { owner, repo, sha, token, aiPct, unreviewedCount } = params;

  const state = unreviewedCount === 0 ? 'success' : aiPct > 80 ? 'failure' : 'pending';
  const description = unreviewedCount === 0
    ? `All AI-generated code reviewed (${aiPct}% AI)`
    : `${unreviewedCount} files need review (${aiPct}% AI)`;

  await fetch(`https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      state,
      description,
      context: 'agent-prov/review',
      target_url: `https://github.com/${owner}/${repo}/pulls`,
    }),
  });
}
