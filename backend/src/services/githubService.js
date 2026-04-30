import { Octokit } from '@octokit/rest';

export class GithubService {
  async getCommits(accessToken, owner, repo) {
    const octokit = new Octokit({ auth: accessToken });
    try {
      const { data } = await octokit.repos.listCommits({
        owner,
        repo,
        per_page: 10
      });
      return data.map(c => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date
      }));
    } catch (error) {
      throw new Error(`GitHub API Error: ${error.message}`);
    }
  }

  async getUserRepos(accessToken) {
    const octokit = new Octokit({ auth: accessToken });
    try {
      const { data } = await octokit.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 20
      });
      return data.map(r => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        owner: r.owner.login
      }));
    } catch (error) {
      throw new Error(`GitHub API Error: ${error.message}`);
    }
  }
}

export default new GithubService();
