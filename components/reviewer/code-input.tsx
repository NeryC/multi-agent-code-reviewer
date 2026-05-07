'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

type Props = {
  disabled?: boolean;
  onSubmit: (inputType: 'snippet' | 'github-url', value: string) => void;
};

export function CodeInput({ disabled, onSubmit }: Props) {
  const [snippet, setSnippet] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  return (
    <Tabs defaultValue="snippet" className="space-y-3">
      <TabsList>
        <TabsTrigger value="snippet">Paste snippet</TabsTrigger>
        <TabsTrigger value="github-url">GitHub file URL</TabsTrigger>
      </TabsList>

      <TabsContent value="snippet" className="space-y-3">
        <Textarea
          placeholder="Paste your code here..."
          value={snippet}
          onChange={(e) => setSnippet(e.target.value)}
          rows={12}
          disabled={disabled}
          className="font-mono text-sm"
        />
        <div className="flex items-center gap-3">
          <Button
            onClick={() => onSubmit('snippet', snippet)}
            disabled={disabled || !snippet.trim()}
          >
            {disabled ? 'Reviewing...' : 'Review'}
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
        <Input
          placeholder="https://github.com/user/repo/blob/main/path/to/file.ts"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          disabled={disabled}
          className="font-mono text-sm"
        />
        <div className="flex items-center gap-3">
          <Button
            onClick={() => onSubmit('github-url', githubUrl)}
            disabled={disabled || !githubUrl.trim()}
          >
            {disabled ? 'Reviewing...' : 'Review'}
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
          Supports <code>github.com/.../blob/...</code> and <code>raw.githubusercontent.com</code> URLs.
          Public repos only.
        </p>
      </TabsContent>
    </Tabs>
  );
}
