import { PrData } from '../types';

/**
 * Parses a GitHub PR URL to extract owner, repo, and pull number.
 * @param url - The GitHub PR URL.
 * @returns An object with owner, repo, and pull_number, or null if invalid.
 */
export const parseGitHubUrl = (url: string): PrData | null => {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    pull_number: parseInt(match[3], 10),
  };
};

/**
 * Calculates the SHA-1 hash of a string.
 * This is necessary to create valid links to files in a GitHub PR review.
 * @param str The string to hash.
 * @returns The SHA-1 hash as a hex string.
 */
export async function sha1(str: string): Promise<string> {
  const textBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', textBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Parses a git diff to identify the line ranges that were changed in each file.
 * This is used to filter AI suggestions to only those relevant to the PR's changes.
 * @param diff The git diff string.
 * @returns A record mapping file paths to an array of {start, end} line ranges in the new file.
 */
export const parseDiffToValidLineRanges = (diff: string): Record<string, { start: number; end: number }[]> => {
  const lines = diff.split('\n');
  const ranges: Record<string, { start: number; end: number }[]> = {};
  let currentFile: string | null = null;

  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      const filePath = line.substring(6);
      if (filePath === '/dev/null') {
          // This is a deleted file, no lines in the "new" version to comment on.
          currentFile = null;
      } else {
          currentFile = filePath;
          if (!ranges[currentFile]) {
            ranges[currentFile] = [];
          }
      }
    } else if (line.startsWith('@@') && currentFile) {
      // Example: @@ -22,7 +22,7 @@
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        const newStart = parseInt(match[1], 10);
        // If length is not specified, it's 1. A length of 0 is possible.
        const newLength = match[2] ? parseInt(match[2], 10) : 1;
        
        if (newLength > 0) {
           ranges[currentFile].push({ start: newStart, end: newStart + newLength - 1 });
        }
      }
    }
  }

  return ranges;
};
