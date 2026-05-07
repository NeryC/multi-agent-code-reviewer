# Multi-Agent Code Reviewer

Three specialized AI agents review your code in parallel — security, performance, and maintainability — and a supervisor synthesizes a scored report.

**Live demo:** https://multi-agent-code-reviewer.vercel.app  
**Stack:** Next.js 16 · AI SDK v6 · Vercel AI Gateway · Zod v4 · Tailwind v4 · Vitest

<!-- ![Workflow in progress](docs/screenshot-workflow.png) -->
<!-- ![Review report](docs/screenshot-report.png) -->

---

## What it does

1. You paste a code snippet or provide a GitHub file URL
2. Three specialist agents run **in parallel** via `Promise.all`:
   - **Security agent** — SQL injection, XSS, auth flaws, input validation, secrets exposure
   - **Performance agent** — N+1 queries, inefficient loops, missing indexes, memory leaks
   - **Maintainability agent** — code complexity, naming, duplication, test coverage, documentation
3. A **supervisor agent** deduplicates findings, prioritizes by severity, and produces a 0–100 score with an executive summary
4. Results stream to the browser via SSE as each agent finishes

---

## Architecture

```
Browser
  └─ POST /api/review  (SSE stream)
       ├─ parseInput       — validate snippet or fetch GitHub file
       ├─ extractMetadata  — language detection, line count, complexity
       ├─ Promise.all([
       │    securityAgent,       ← claude-sonnet-4.6
       │    performanceAgent,    ← claude-sonnet-4.6
       │    maintainabilityAgent ← claude-sonnet-4.6
       │  ])
       └─ supervisorAgent  ← claude-haiku-4.5 (consolidate + score)
```

All four agents use `generateObject` (AI SDK v6) with Zod schemas — zero markdown parsing, fully structured output.

The workflow emits Server-Sent Events as each step starts and finishes, so the browser renders a live progress timeline without polling.

---

## File map

```
app/
  page.tsx                   — server component shell
  reviewer-client.tsx        — 'use client', useReviewStream hook, top-level layout
  api/review/route.ts        — SSE endpoint, rate limit, orchestration

lib/
  schemas.ts                 — Zod schemas (Finding, ReviewReport)
  metadata.ts                — extractMetadata (language detection, complexity)
  github.ts                  — GitHub URL → raw.githubusercontent.com
  rate-limit.ts              — in-memory IP rate limiter
  agent/
    model.ts                 — model ID constants
    security.ts              — security specialist agent
    performance.ts           — performance specialist agent
    maintainability.ts       — maintainability specialist agent
    supervisor.ts            — supervisor agent (consolidate + score)
  workflow/
    orchestrate.ts           — orchestrate() — sends SSE events, runs agents

components/reviewer/
  code-input.tsx             — snippet textarea + GitHub URL tab
  workflow-progress.tsx      — live step timeline
  finding-card.tsx           — collapsible finding with optional diff
  report-summary.tsx         — score gauge + category breakdown + tabbed findings
```

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| AI SDK | Vercel AI SDK v6 (`generateObject`) |
| Models | `anthropic/claude-sonnet-4.6` (review), `anthropic/claude-haiku-4.5` (supervisor) |
| Gateway | Vercel AI Gateway (single API key, automatic model routing) |
| Schemas | Zod v4 |
| Styling | Tailwind v4 + shadcn/ui |
| Testing | Vitest + happy-dom |
| Deploy | Vercel (Node.js runtime, 120s function timeout) |

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
npm run dev          # http://localhost:3000
npm test             # 18 unit tests
```

---

## Technical decisions

**Single SSE endpoint instead of POST + poll**  
The spec called for a POST to start the job and a separate SSE endpoint to poll status — which requires shared state (e.g., Vercel KV). Instead, the POST itself returns the SSE stream. The client holds the connection open while agents run (~15–30s). This eliminates the need for external storage while providing identical live-progress UX.

**`generateObject` for all agents**  
Each agent call returns a typed object validated by a Zod schema. No markdown parsing, no regex extraction — the model is constrained to valid JSON that matches the schema on every call.

**Parallel specialist agents, sequential supervisor**  
The three specialist agents run via `Promise.all` to minimize total latency. The supervisor runs after all three finish so it can deduplicate across all finding sets and compute an aggregate score.

**Haiku for the supervisor**  
The supervisor task is mechanical (sort, deduplicate, count, summarize) and doesn't require deep reasoning. Using `claude-haiku-4.5` here cuts cost while `claude-sonnet-4.6` is reserved for the nuanced analysis work of the three specialists.

---

## Limits

- **Rate limit:** 3 reviews per IP per hour
- **Max function duration:** 120 seconds (Vercel)
- **GitHub URLs:** public repos only
- **Code size:** no hard limit, but very large files may hit the 120s timeout
