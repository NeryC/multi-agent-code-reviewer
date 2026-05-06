import { describe, it, expect, vi } from 'vitest';
import { fetchGitHubFile } from '../github';

describe('fetchGitHubFile', () => {
  it('fetches raw content from a raw.githubusercontent.com URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'const x = 1;',
    }));
    const result = await fetchGitHubFile('https://raw.githubusercontent.com/user/repo/main/file.ts');
    expect(result).toBe('const x = 1;');
    vi.unstubAllGlobals();
  });

  it('converts a github.com blob URL to raw format', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => 'code' });
    vi.stubGlobal('fetch', mockFetch);
    await fetchGitHubFile('https://github.com/user/repo/blob/main/file.ts');
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('raw.githubusercontent.com');
    expect(calledUrl).not.toContain('/blob/');
    vi.unstubAllGlobals();
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'not found',
    }));
    await expect(
      fetchGitHubFile('https://raw.githubusercontent.com/x/y/main/z.ts')
    ).rejects.toThrow('404');
    vi.unstubAllGlobals();
  });

  it('throws on a non-GitHub URL', async () => {
    await expect(fetchGitHubFile('https://evil.com/file.ts')).rejects.toThrow(/github/i);
  });
});
