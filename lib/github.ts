function toRawUrl(url: string): string {
  if (!url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
    throw new Error('Only GitHub URLs are supported (github.com or raw.githubusercontent.com)');
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
  return res.text();
}
