
import { PrData } from '../types';
// @ts-ignore - The build environment will handle this dynamic import
import { Octokit } from 'https://esm.sh/@octokit/rest';

const getGithubToken = () => {
  const token = localStorage.getItem('GITHUB_API_KEY');
  return token || process.env.GITHUB_API_KEY || '';
};

export const githubService = {
  getPrData: async (prData: PrData) => {
    const token = getGithubToken();
    if (!token) throw new Error('GitHub token not found.');
    const octokit = new Octokit({ auth: token });
    const { data: prDetails } = await octokit.pulls.get(prData);
    const { data: diff } = await octokit.pulls.get({ ...prData, mediaType: { format: 'diff' } });
    return { prDetails, diff: diff as unknown as string };
  },

  getReadmeContent: async (owner: string, repo: string, ref: string) => {
    const token = getGithubToken();
    if (!token) throw new Error('GitHub token not found.');
    const octokit = new Octokit({ auth: token });
    try {
      const { data: readmeData } = await octokit.repos.getContent({ owner, repo, path: 'README.md', ref });
      // @ts-ignore
      return atob(readmeData.content);
    } catch (e) {
      console.warn("README.md not found in the repository.");
      return "README.md not found in the repository.";
    }
  },

  getChangedFilesContent: async (diff: string, owner: string, repo: string, ref: string) => {
    const filePaths = diff.split('\n')
      .filter(line => line.startsWith('+++ b/'))
      .map(line => line.substring(6));
    
    let masterFilesContent = '';
    for (const filePath of new Set(filePaths)) { // Use Set to avoid duplicate fetches for same file
        try {
            // Using raw.githubusercontent.com is often faster and avoids API rate limits for public repos
            const response = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath}`);
            if (response.ok) {
                const content = await response.text();
                masterFilesContent += `--- File: ${filePath} ---\n${content}\n\n`;
            } else {
                masterFilesContent += `--- File: ${filePath} ---\n(This is a new file or could not be fetched from the base branch.)\n\n`;
            }
        } catch (e) {
            console.error(`Error fetching file content for ${filePath}:`, e);
            masterFilesContent += `--- File: ${filePath} ---\n(Error fetching file content.)\n\n`;
        }
    }
    return masterFilesContent;
  }
};
