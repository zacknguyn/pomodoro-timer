import { Octokit } from '@octokit/rest';

export class GithubService {
  async searchCommitsByDate(accessToken, date) {
    const octokit = new Octokit({ auth: accessToken });
    try {
      const { data: user } = await octokit.users.getAuthenticated();
      const { data } = await octokit.search.commits({
        q: `author:${user.login} committer-date:${date}`,
        per_page: 30,
        sort: 'committer-date',
      });
      return data.items.map(c => ({
        sha: c.sha.slice(0, 7),
        message: c.commit.message.split('\n')[0],
        repo: c.repository.full_name,
        url: c.html_url,
        date: c.commit.committer.date,
      }));
    } catch (error) {
      throw new Error(`GitHub API Error: ${error.message}`);
    }
  }

  async searchCommitsByDate(accessToken, date) {
    const octokit = new Octokit({ auth: accessToken });
    try {
      const { data: user } = await octokit.users.getAuthenticated();
      const { data } = await octokit.search.commits({
        q: `author:${user.login} committer-date:${date}`,
        per_page: 30,
        sort: 'committer-date',
      });
      return data.items.map(c => ({
        sha: c.sha.slice(0, 7),
        message: c.commit.message.split('\n')[0],
        repo: c.repository.full_name,
        url: c.html_url,
        date: c.commit.committer.date,
      }));
    } catch (error) {
      throw new Error(`GitHub API Error: ${error.message}`);
    }
  }

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
        authorLogin: c.author?.login || null,
        date: c.commit.author.date
      }));
    } catch (error) {
      throw new Error(`GitHub API Error: ${error.message}`);
    }
  }

  async getCommitHeatmap(accessToken) {
    try {
      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `{
            viewer {
              contributionsCollection(
                from: "${new Date(Date.now() - 364 * 24 * 60 * 60 * 1000).toISOString()}"
                to: "${new Date().toISOString()}"
              ) {
                contributionCalendar {
                  weeks {
                    contributionDays {
                      date
                      contributionCount
                    }
                  }
                }
              }
            }
          }`
        }),
      });
      const { data } = await res.json();
      const days = data.viewer.contributionsCollection.contributionCalendar.weeks
        .flatMap(w => w.contributionDays)
        .slice(-364);

      while (days.length < 364) days.unshift({ date: '', contributionCount: 0 });

      return days.map(d => {
        const c = d.contributionCount;
        return { date: d.date, level: c >= 10 ? 3 : c >= 4 ? 2 : c >= 1 ? 1 : 0, count: c };
      });
    } catch (error) {
      throw new Error(`GitHub GraphQL Error: ${error.message}`);
    }
  }

  async getUserRepos(accessToken) {
    const octokit = new Octokit({ auth: accessToken });
    try {
      const { data } = await octokit.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 50,
        affiliation: 'owner,collaborator,organization_member',
      });
      return data.map(r => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        owner: r.owner.login,
      }));
    } catch (error) {
      throw new Error(`GitHub API Error: ${error.message}`);
    }
  }
}

export default new GithubService();
