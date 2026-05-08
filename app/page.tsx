import { ReviewerClient } from './reviewer-client';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  return (
    <main className="container mx-auto max-w-3xl p-6 space-y-8">
      <header className="space-y-4">
        <div className="space-y-3">
          {/* Agent count pill */}
          <Badge
            variant="secondary"
            className="text-xs font-medium px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
          >
            3 specialized agents · Security, Performance, Maintainability
          </Badge>

          {/* Gradient heading */}
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-violet-400 bg-clip-text text-transparent">
            Multi-Agent Code Reviewer
          </h1>

          <p className="text-muted-foreground">
            Paste a snippet or a GitHub file URL. Three specialized AI agents review your code in
            parallel — security, performance, and maintainability — and a supervisor synthesizes a
            scored report.
          </p>
        </div>

        {/* How it works grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {[
            { step: '1', title: 'Analyze', desc: 'Parse your code and extract metadata' },
            { step: '2', title: 'Review in Parallel', desc: 'Three agents run simultaneously' },
            { step: '3', title: 'Supervisor', desc: 'Synthesizes all agent findings' },
            { step: '4', title: 'Report', desc: 'Scored findings with fix suggestions' },
          ].map(({ step, title, desc }) => (
            <div
              key={step}
              className="rounded-lg border bg-card p-3 space-y-1"
            >
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Step {step}
              </div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>
      </header>

      <ReviewerClient />
    </main>
  );
}
