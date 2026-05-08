# Multi-Agent Code Reviewer

Three specialized AI agents review your code in parallel — security, performance, and maintainability — and a supervisor synthesizes a scored report from 0 to 100.

> **Live demo:** [multi-agent-code-reviewer-sable.vercel.app](https://multi-agent-code-reviewer-sable.vercel.app)  
> **GitHub:** [github.com/NeryC/multi-agent-code-reviewer](https://github.com/NeryC/multi-agent-code-reviewer)

<!--
![Workflow in progress](docs/screenshot-workflow.png)
![Review report](docs/screenshot-report.png)
-->

---

## What does this project do?

The Multi-Agent Code Reviewer demonstrates a **multi-agent orchestration architecture**: instead of using a single language model to do everything, four specialized agents work with distinct responsibilities:

1. **Security Agent** — detects vulnerabilities: SQL injection, XSS, hardcoded secrets, input validation gaps, authentication flaws
2. **Performance Agent** — detects efficiency problems: N+1 queries, inefficient loops, memory leaks, unnecessary blocking operations
3. **Maintainability Agent** — evaluates code quality: complexity, variable naming, duplication, test coverage, documentation
4. **Supervisor** — consolidates findings from the 3 agents, removes duplicates, prioritizes by severity, writes an executive summary, and assigns an overall score of 0–100

The 3 specialist agents run **in parallel** via `Promise.all`, minimizing total analysis time. Results reach the browser as real-time SSE events as each agent completes.

---

## Step-by-step tutorial

### Step 1: Open the application

Go to [multi-agent-code-reviewer-sable.vercel.app](https://multi-agent-code-reviewer-sable.vercel.app). You will see a panel with two input options: **snippet** (paste code directly) and **GitHub URL** (analyze a file from a public repository).

### Step 2: Paste your code or enter a GitHub URL

**Option A — Snippet** (paste code directly into the editor):

```python
import sqlite3

def get_user(username, password):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    # Direct concatenation — vulnerable to SQL injection
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    return cursor.fetchone()
```

**Option B — GitHub URL** (analyze a file from a public repo):

```
https://github.com/user/repository/blob/main/src/api/auth.py
```

The application automatically converts the URL to `raw.githubusercontent.com` to fetch the raw file content.

### Step 3: Click "Review"

Once you submit the code, you will see a **live progress timeline**:

```
✓ Input parsed           → valid code detected (Python, 12 lines)
✓ Metadata extracted     → complexity: low

🔄 Security agent        → analyzing...
🔄 Performance agent     → analyzing...
🔄 Maintainability agent → analyzing...

✓ Security agent         → 2 findings
✓ Maintainability agent  → 3 findings
✓ Performance agent      → 1 finding

🔄 Supervisor            → consolidating...
✓ Supervisor             → report ready

Score: 42/100
```

The 3 agents run in parallel — you will notice they can complete in any order.

### Step 4: Read the report

The final report includes:

- **Visual gauge** showing the score (0–100) with color coding: red (<50), orange (50–70), yellow (70–85), green (85+)
- **Executive summary** of 2–3 sentences about what the code does and its overall quality
- **Top recommendation** — the most important thing to fix first
- **Tabs by category** — Security / Performance / Maintainability with their findings
- **Expandable cards** for each finding, with:
  - Severity badge (critical / high / medium / low / info)
  - Problem description
  - Fix suggestion
  - Code diff (before/after) when the agent generated one

### Example finding

For the Python code above, the security agent would produce something like:

```
🔴 CRITICAL — SQL Injection Vulnerability

Line 7
The query builds SQL by directly concatenating user inputs without sanitization.
An attacker can use: username = "' OR 1=1 --" to access all users.

Suggestion: Use parameterized queries.

Before:
  query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"

After:
  query = "SELECT * FROM users WHERE username = ? AND password = ?"
  cursor.execute(query, (username, password))
```

---

## Internal demo: full flow walkthrough

The following traces every step from the browser click to the final SSE event:

```
User pastes code and clicks "Review"
         │
         ▼
┌────────────────────────────────────────────────────┐
│  Browser — reviewer-client.tsx                     │
│  POST /api/review                                  │
│  Body: { inputType: "snippet", value: "..." }      │
│  Opens EventSource → listens for SSE events        │
└──────────────────────┬─────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│  /api/review/route.ts                              │
│                                                    │
│  1. Rate limit: 3 reviews/IP/hour                  │
│  2. Validates body: inputType + value present      │
│  3. Creates ReadableStream (SSE)                   │
│  4. Calls orchestrate(send, body)                  │
└──────────────────────┬─────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  lib/workflow/orchestrate.ts — the orchestration director                  │
│                                                                            │
│  1. send({ type: 'started', jobId })                                       │
│                                                                            │
│  2. Step "parseInput":                                                     │
│     - If inputType === 'github-url': fetchGitHubFile(url)                  │
│       → converts GitHub URL to raw.githubusercontent.com                   │
│       → fetches the raw file content                                       │
│     - If inputType === 'snippet': uses the code directly                   │
│     send({ type: 'step', name: 'parseInput', status: 'done' })            │
│                                                                            │
│  3. Step "extractMetadata":                                                │
│     - Detects language (Python, JS, Go...) by keywords                     │
│     - Counts lines                                                         │
│     - Estimates complexity (low/medium/high)                               │
│     send({ type: 'step', name: 'extractMetadata', status: 'done' })       │
│                                                                            │
│  4. Announces all 3 agents as "running" BEFORE awaiting them               │
│     send({ type: 'agent', name: 'security', status: 'running' })          │
│     send({ type: 'agent', name: 'performance', status: 'running' })       │
│     send({ type: 'agent', name: 'maintainability', status: 'running' })   │
│                                                                            │
│  5. Promise.all — the 3 agents run in parallel:                            │
│                                                                            │
│     ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────┐  │
│     │  securityAgent       │  │  performanceAgent    │  │  maintAgent  │  │
│     │  generateObject(     │  │  generateObject(     │  │  generateObj │  │
│     │    claude-sonnet-4.6 │  │    claude-sonnet-4.6 │  │    sonnet    │  │
│     │    FindingArraySchema│  │    FindingArraySchema│  │    Finding.. │  │
│     │  )                   │  │  )                   │  │  )           │  │
│     └──────────┬───────────┘  └──────────┬───────────┘  └──────┬───────┘  │
│               done                      done                  done        │
│                │                          │                     │          │
│           send(agent done)          send(agent done)       send(done)     │
│                                                                            │
│  6. Supervisor (sequential — needs all 3 results):                         │
│     runSupervisorAgent(allFindings, meta)                                  │
│     → claude-haiku-4.5 + ReviewReportSchema                               │
│     → deduplicates, prioritizes, writes summary, assigns score            │
│     send({ type: 'report', report })                                       │
│     send({ type: 'done' })                                                 │
└────────────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Browser receives SSE events in real time           │
│  useReviewStream hook updates React state           │
│  WorkflowProgress renders the live timeline         │
│  ReportSummary renders the final report             │
└─────────────────────────────────────────────────────┘
```

---

## Code architecture

### Folder structure

```
multi-agent-code-reviewer/
├── app/
│   ├── page.tsx                    # Server shell (imports the client component)
│   ├── reviewer-client.tsx         # 'use client' — layout, useReviewStream, state
│   └── api/review/
│       └── route.ts                # SSE endpoint — rate limit + orchestration
├── lib/
│   ├── schemas.ts                  # Zod schemas: Finding, CodeMetadata, ReviewReport
│   ├── metadata.ts                 # extractMetadata() — language and complexity detection
│   ├── github.ts                   # fetchGitHubFile() — converts GitHub URL to content
│   ├── rate-limit.ts               # In-memory rate limiter (IP-based)
│   ├── agent/
│   │   ├── model.ts                # REVIEW_MODEL and SUPERVISOR_MODEL constants
│   │   ├── security.ts             # runSecurityAgent()
│   │   ├── performance.ts          # runPerformanceAgent()
│   │   ├── maintainability.ts      # runMaintainabilityAgent()
│   │   └── supervisor.ts           # runSupervisorAgent()
│   └── workflow/
│       └── orchestrate.ts          # orchestrate() — drives all agents
└── components/reviewer/
    ├── code-input.tsx              # Code editor + GitHub URL tab
    ├── workflow-progress.tsx       # Real-time agent timeline
    ├── finding-card.tsx            # Expandable card with code diff
    └── report-summary.tsx          # Score gauge + tabs by category
```

### File-by-file: what each file does

#### `lib/schemas.ts` — The data contracts for the entire application

```typescript
// An individual finding from any agent
export const FindingSchema = z.object({
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  category: z.enum(['security', 'performance', 'maintainability']),
  title: z.string(),
  line: z.number().int().positive().optional(),   // Line number of the issue
  description: z.string(),                         // Problem description
  suggestion: z.string(),                          // How to fix it
  codeExample: z.object({                          // Before/after diff (optional)
    before: z.string(),
    after: z.string(),
  }).optional(),
});

// The final report produced by the supervisor
export const ReviewReportSchema = z.object({
  score: z.number().int().min(0).max(100),          // Overall score
  summary: z.string(),                               // Executive summary (2–3 sentences)
  recommendation: z.string(),                        // The single most important action
  findings: FindingArraySchema,                      // All consolidated findings
});
```

These schemas are the contracts between the agents and the UI. The AI SDK's `generateObject` automatically validates that the model's output conforms to the schema before returning it.

---

#### `lib/metadata.ts` — Language and complexity detection

```typescript
function detectLanguage(code: string): string {
  if (code.includes('def ') && code.includes(':') && !code.includes('=>')) return 'python';
  if (code.includes('fn ') && code.includes('->') && code.includes('let ')) return 'rust';
  if (code.includes('public static void main')) return 'java';
  if (/SELECT\s+\w|FROM\s+\w/i.test(code)) return 'sql';
  if (code.includes(': string') || code.includes(': number') || ...) return 'typescript';
  return 'javascript';
}

export function extractMetadata(code: string): CodeMetadata {
  const lines = code.split('\n').length;
  return {
    lang: detectLanguage(code),
    lines,
    estimatedComplexity: lines > 200 ? 'high' : lines > 50 ? 'medium' : 'low',
  };
}
```

The metadata is passed to every agent so that the prompt can specify the language and size context, improving the quality of findings.

---

#### `lib/github.ts` — Fetching GitHub files

```typescript
function toRawUrl(url: string): string {
  // Converts: https://github.com/user/repo/blob/branch/path
  //        → https://raw.githubusercontent.com/user/repo/branch/path
  return url
    .replace('https://github.com/', 'https://raw.githubusercontent.com/')
    .replace('/blob/', '/');
}

export async function fetchGitHubFile(url: string): Promise<string> {
  const rawUrl = toRawUrl(url);
  const res = await fetch(rawUrl);
  if (!res.ok) throw new Error(`Failed to fetch GitHub file: ${res.status}`);
  return res.text();
}
```

Users can paste a normal `github.com/.../blob/...` URL — the function converts it to the raw content URL transparently.

---

#### `lib/rate-limit.ts` — In-memory rate limiter

```typescript
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, opts: RateLimitOptions) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    // First request in the window, or window has expired — reset
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.max - 1 };
  }

  if (existing.count >= opts.max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: opts.max - existing.count };
}
```

Simple sliding-window counter keyed by IP address. Each review triggers 4 LLM calls, so the limit is set conservatively to 3 reviews per IP per hour.

---

#### `lib/agent/security.ts` — The security agent

```typescript
const SYSTEM = `You are a security code reviewer. Analyze the provided code and identify security vulnerabilities.

Focus on:
- SQL injection, command injection, XSS vulnerabilities
- Hardcoded secrets, API keys, passwords
- Insecure deserialization or eval usage
- Missing input validation at system boundaries
- Dangerous use of user-controlled data
- Authentication or authorization flaws

Return a list of findings. If the code is secure, return an empty array.
For each finding with a code fix, include a codeExample with before/after.
Be concise: title max 10 words, description max 50 words, suggestion max 50 words.`;

export async function runSecurityAgent(code: string, meta: CodeMetadata): Promise<Finding[]> {
  const { object } = await generateObject({
    model: REVIEW_MODEL,              // claude-sonnet-4.6
    schema: FindingArraySchema,       // The model MUST return JSON matching this schema
    system: SYSTEM,
    prompt: `Language: ${meta.lang}\nLines: ${meta.lines}\n\nCode to review:\n\`\`\`${meta.lang}\n${code}\n\`\`\``,
  });
  return object; // Already validated and typed: Finding[]
}
```

The Performance and Maintainability agents have the exact same structure — only the `SYSTEM` prompt changes to reflect each specialist's focus area.

---

#### `lib/agent/supervisor.ts` — The consolidating supervisor

```typescript
const SYSTEM = `You are a senior engineering lead synthesizing findings from 3 specialized code reviewers.

Your job:
1. Deduplicate findings that cover the same underlying issue (keep the most specific one)
2. Reprioritize: security > performance > maintainability when severity is equal
3. Write a 2-3 sentence executive summary (what the code does, overall quality)
4. Write a 1-sentence actionable recommendation (most important thing to fix first)
5. Assign a score 0-100:
   90+ = production-ready
   70-89 = minor issues
   50-69 = needs work before shipping
   <50 = significant problems`;

export async function runSupervisorAgent(findings: Finding[], meta: CodeMetadata): Promise<ReviewReport> {
  const { object } = await generateObject({
    model: SUPERVISOR_MODEL,          // claude-haiku-4.5 (cheaper for mechanical synthesis)
    schema: ReviewReportSchema,       // Finding[] + score + summary + recommendation
    system: SYSTEM,
    prompt: `Code metadata: ${meta.lang}, ${meta.lines} lines\n\nRaw findings:\n${JSON.stringify(findings, null, 2)}`,
  });
  return object;
}
```

**Why Haiku for the supervisor?** The supervisor's task is mechanical: sort, deduplicate, count, summarize. It does not require the deep reasoning that specialists need to detect subtle vulnerabilities. Using Haiku here reduces cost without sacrificing output quality.

---

#### `lib/workflow/orchestrate.ts` — The orchestration director

```typescript
export async function orchestrate(send: SendEvent, input: ReviewInput): Promise<void> {
  const jobId = crypto.randomUUID();
  send({ type: 'started', jobId });

  // Step 1: Fetch the code
  const code = input.inputType === 'github-url'
    ? await fetchGitHubFile(input.value)  // Download from GitHub
    : input.value;                         // Or use the snippet directly

  // Step 2: Extract metadata
  const meta = extractMetadata(code);     // lang, lines, estimatedComplexity

  // Step 3: Announce all 3 agents as "running" BEFORE awaiting them
  // This causes the UI to show all three as running simultaneously
  send({ type: 'agent', name: 'security', status: 'running' });
  send({ type: 'agent', name: 'performance', status: 'running' });
  send({ type: 'agent', name: 'maintainability', status: 'running' });

  // Step 4: Run the 3 agents in parallel
  const [secFindings, perfFindings, maintFindings] = await Promise.all([
    runSecurityAgent(code, meta).then((findings) => {
      send({ type: 'agent', name: 'security', status: 'done', findings });
      return findings;
    }),
    runPerformanceAgent(code, meta).then((findings) => {
      send({ type: 'agent', name: 'performance', status: 'done', findings });
      return findings;
    }),
    runMaintainabilityAgent(code, meta).then((findings) => {
      send({ type: 'agent', name: 'maintainability', status: 'done', findings });
      return findings;
    }),
  ]);

  // Step 5: Supervisor (sequential — needs all 3 results first)
  const report = await runSupervisorAgent(
    [...secFindings, ...perfFindings, ...maintFindings],
    meta,
  );

  send({ type: 'report', report });
  send({ type: 'done' });
}
```

**The SSE trick:** instead of polling from the client ("is it done yet?"), the client opens an SSE connection and the server pushes events as they occur. This gives a real-time progress UX without any additional infrastructure.

---

#### `app/api/review/route.ts` — The SSE endpoint

```typescript
export async function POST(req: Request) {
  // Rate limit: 3 reviews/IP/hour
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limit = rateLimit(ip, { max: 3, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) return new Response('Rate limit exceeded', { status: 429 });

  const body = await req.json() as ReviewInput;

  // Create a ReadableStream that will emit SSE events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        // SSE format: "data: <json>\n\n"
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await orchestrate(send, body);
      } catch (err) {
        send({ type: 'error', message: String(err) });
      } finally {
        controller.close(); // Close the SSE connection
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',  // Tells the browser this is an SSE stream
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

#### `app/reviewer-client.tsx` — The React client layer

The `useReviewStream` hook manages all the streaming state:

```typescript
function useReviewStream() {
  const [events, setEvents] = useState<WorkflowEventType[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startReview = useCallback(async (inputType, value) => {
    // 1. POST to /api/review
    const res = await fetch('/api/review', { method: 'POST', body: JSON.stringify({ inputType, value }) });

    // 2. Read the SSE stream chunk by chunk
    const reader = res.body.getReader();
    let buffer = '';

    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;

      buffer += decoder.decode(chunk, { stream: true });
      const parts = buffer.split('\n\n');  // SSE events are separated by \n\n
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        if (!part.startsWith('data: ')) continue;
        const event = JSON.parse(part.slice('data: '.length));
        setEvents((prev) => [...prev, event]);
        if (event.type === 'report') setReport(event.report);
        if (event.type === 'done') setStatus('done');
        if (event.type === 'error') { setStatus('error'); setErrorMsg(event.message); }
      }
    }
  }, []);

  return { events, status, report, errorMsg, startReview };
}
```

---

#### `components/reviewer/workflow-progress.tsx` — Live agent timeline

Takes the full array of SSE events and builds a list of step entries with state (`pending`, `running`, `done`, `error`). Each step renders a colored badge. The `running` state has an `animate-pulse` Tailwind class for the visual breathing effect.

---

#### `components/reviewer/finding-card.tsx` — Expandable finding card

Renders a single `Finding` with severity badge, description, and fix suggestion. When the finding includes a `codeExample`, a "Show code example" toggle reveals a `ReactDiffViewer` component with the before/after diff. The diff viewer is loaded with `next/dynamic` and `ssr: false` because it depends on browser APIs.

---

#### `components/reviewer/report-summary.tsx` — Score gauge and category tabs

The `ScoreGauge` component is a pure SVG circle with a `strokeDashoffset` calculated from the score value. Color thresholds: green ≥ 80, yellow ≥ 60, orange ≥ 40, red below 40. The findings are split by category and displayed in tabs.

---

### How `generateObject` works — the heart of every agent

`generateObject` is the AI SDK v6 function that:
1. Calls the language model
2. Asks it to respond in JSON format following a specific Zod schema
3. Automatically validates the response against that schema
4. Throws an error if the model does not comply (or retries, depending on config)

```typescript
const { object } = await generateObject({
  model: REVIEW_MODEL,
  schema: FindingArraySchema,  // Zod schema = the contract
  system: "You are a security reviewer...",
  prompt: `Code:\n${code}`,
});
// object is Finding[] — fully typed, no manual parsing
```

**Why is this better than parsing free text?** If the model returns markdown with findings in prose, you need fragile regex or parsing logic. With `generateObject`, the model is required to return structured JSON, and if it does not, the SDK rejects it. Zero parsing, zero edge cases.

---

## Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 App Router | Server Components, Route Handlers, Vercel deployment |
| AI SDK | Vercel AI SDK v6 | `generateObject` with Zod, native streaming |
| Models | `claude-sonnet-4.6` (specialists) + `claude-haiku-4.5` (supervisor) | Sonnet for deep analysis, Haiku for mechanical synthesis |
| Gateway | Vercel AI Gateway | Single API key for all models |
| Schemas | Zod v4 | Contracts between agents and UI, automatic validation |
| Streaming | Native SSE (Server-Sent Events) | No external dependencies, works in any browser |
| UI | Tailwind v4 | Reviewer components built from scratch |
| Deployment | Vercel (Hobby, 120s timeout) | Sufficient for analysis of most files |

---

## Local setup

```bash
git clone https://github.com/NeryC/multi-agent-code-reviewer
cd multi-agent-code-reviewer
npm install
```

Create `.env.local`:
```env
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key
```

```bash
npm run dev    # → http://localhost:3000
npm test       # → runs schemas, metadata, rate-limit tests
```

---

## Technical decisions explained

### Why a single SSE endpoint instead of POST + polling?

The alternative architecture would be:
1. `POST /api/review/start` → returns a `jobId`
2. `GET /api/review/status?jobId=xxx` → client polls every second
3. You need shared storage (Vercel KV, Redis) so job state persists across requests

With a single SSE endpoint, the POST itself is the stream. The client opens the connection and the server pushes events while the agents work. This eliminates the need for external storage while delivering exactly the same real-time progress UX.

### Why parallel agents + supervisor instead of a single agent?

A single agent that reviews security, performance, and maintainability at the same time tends to:
- Miss categories when the code is long
- Be less systematic than a focused specialist
- Produce unbalanced findings (many in one category, few in others)

With specialized agents, each one has its own system prompt with detailed criteria for its domain. The supervisor receives the consolidated results and only needs to sort, deduplicate, and summarize — a task well-suited for Haiku.

### Why `Promise.all` instead of sequential execution?

The 3 specialist agents are completely independent — the security agent does not need the performance agent's results and vice versa. Running them in parallel reduces total time from ~45 seconds (sequential) to ~15 seconds (parallel). The supervisor does need all 3 results, so it runs after `Promise.all` resolves.

### Why Zod schemas as agent contracts?

Without structured output, each agent's response would be free-form text requiring fragile parsing. With Zod schemas passed to `generateObject`, the AI SDK enforces the shape at the boundary between the LLM and your application code. If the model hallucinates a field or omits a required property, the SDK rejects the response before it ever reaches your business logic. This makes the agents reliable components rather than unpredictable text producers.

---

## Limits

| Limit | Value | Reason |
|-------|-------|--------|
| Reviews per IP/hour | 3 | Each review makes 4 LLM calls (costly) |
| Maximum timeout | 120 seconds | Vercel Hobby plan limit |
| GitHub repos | Public only | No OAuth implemented |
| Code size | No hard limit | Very large files may hit the timeout |
