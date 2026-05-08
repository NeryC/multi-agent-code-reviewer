'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

const EXAMPLE_SNIPPET = `async function getUser(req, res) {
  const query = "SELECT * FROM users WHERE id = " + req.params.id;
  const user = await db.query(query);

  for (const friend of user.friends) {
    const posts = await db.query(\`SELECT * FROM posts WHERE user_id = \${friend}\`);
    user.friendPosts = user.friendPosts || [];
    user.friendPosts.push(...posts);
  }

  res.json(user);
}`;

const EXAMPLE_URL = 'https://github.com/NeryC/research-agent/blob/main/lib/rate-limit.ts';

// Maximum allowed characters in the snippet textarea
const MAX_SNIPPET_LENGTH = 10_000;

// A valid GitHub blob URL must contain github.com and /blob/
const GITHUB_BLOB_RE = /github\.com\/.+\/blob\/.+/;

type Props = {
  disabled?: boolean;
  onSubmit: (inputType: 'snippet' | 'github-url', value: string) => void;
};

export function CodeInput({ disabled, onSubmit }: Props) {
  const [snippet, setSnippet] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  // Character count helpers
  const charCount = snippet.length;
  const showCharCounter = charCount > MAX_SNIPPET_LENGTH * 0.8;
  const overLimit = charCount > MAX_SNIPPET_LENGTH;

  // GitHub URL validation
  const githubUrlTrimmed = githubUrl.trim();
  const githubUrlInvalid =
    githubUrlTrimmed.length > 0 && !GITHUB_BLOB_RE.test(githubUrlTrimmed);

  return (
    <Tabs defaultValue="snippet" className="space-y-3">
      <TabsList>
        <TabsTrigger value="snippet">Paste snippet</TabsTrigger>
        <TabsTrigger value="github-url">GitHub file URL</TabsTrigger>
      </TabsList>

      <TabsContent value="snippet" className="space-y-3">
        <div className="relative">
          <Textarea
            placeholder="Paste your code here..."
            value={snippet}
            onChange={(e) => setSnippet(e.target.value)}
            rows={12}
            maxLength={MAX_SNIPPET_LENGTH}
            disabled={disabled}
            className="font-mono text-sm"
            aria-describedby={showCharCounter ? 'snippet-char-count' : undefined}
          />
          {/* Character counter — only shown when approaching the limit */}
          {showCharCounter && (
            <span
              id="snippet-char-count"
              className={`absolute bottom-2 right-3 text-xs tabular-nums ${
                overLimit ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
              }`}
            >
              {charCount.toLocaleString()} / {MAX_SNIPPET_LENGTH.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => onSubmit('snippet', snippet)}
            disabled={disabled || !snippet.trim() || overLimit}
          >
            {disabled ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Reviewing...
              </>
            ) : (
              'Review'
            )}
          </Button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setSnippet(EXAMPLE_SNIPPET)}
            className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50"
          >
            Load example
          </button>
        </div>
      </TabsContent>

      <TabsContent value="github-url" className="space-y-3">
        <div className="space-y-1">
          <Input
            placeholder="https://github.com/user/repo/blob/main/path/to/file.ts"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            disabled={disabled}
            className={`font-mono text-sm ${githubUrlInvalid ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
            aria-invalid={githubUrlInvalid}
            aria-describedby={githubUrlInvalid ? 'github-url-error' : undefined}
          />
          {/* Inline validation error */}
          {githubUrlInvalid && (
            <p id="github-url-error" className="text-xs text-red-600 dark:text-red-400">
              URL must point to a specific file — use the <code>/blob/</code> format from GitHub.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => onSubmit('github-url', githubUrl)}
            disabled={disabled || !githubUrlTrimmed || githubUrlInvalid}
          >
            {disabled ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Reviewing...
              </>
            ) : (
              'Review'
            )}
          </Button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setGithubUrl(EXAMPLE_URL)}
            className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50"
          >
            Load example URL
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Supports <code>github.com/.../blob/...</code> and <code>raw.githubusercontent.com</code>{' '}
          URLs. Public repos only.
        </p>
      </TabsContent>
    </Tabs>
  );
}
