// Maximum file size we are willing to fetch (100 KB)
const MAX_FILE_BYTES = 100 * 1024;

function toRawUrl(url: string): string {
  if (!url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
    throw new Error('Only GitHub URLs are supported (github.com or raw.githubusercontent.com)');
  }

  // Directory URLs point to a tree view, not a file
  if (url.includes('/tree/')) {
    throw new Error(
      'That URL points to a directory, not a file. Navigate to a specific file and copy the URL.',
    );
  }

  if (url.includes('raw.githubusercontent.com')) return url;

  // Convert: https://github.com/user/repo/blob/branch/path
  //       → https://raw.githubusercontent.com/user/repo/branch/path
  return url
    .replace('https://github.com/', 'https://raw.githubusercontent.com/')
    .replace('/blob/', '/');
}

export async function fetchGitHubFile(url: string): Promise<string> {
  const rawUrl = toRawUrl(url);
  const res = await fetch(rawUrl);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch GitHub file: ${res.status} ${body}`);
  }

  // Enforce file size limit to prevent sending massive files to the AI agents
  const contentLength = res.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_FILE_BYTES) {
    throw new Error(
      `File is too large (${Math.round(parseInt(contentLength, 10) / 1024)} KB). Please paste a representative snippet instead.`,
    );
  }

  const text = await res.text();

  // Double-check size after reading in case content-length header was absent
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) {
    throw new Error(
      'File is too large (> 100 KB). Please paste a representative snippet instead.',
    );
  }

  return text;
}
