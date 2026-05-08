import { Badge } from '@/components/ui/badge';
import { FileSearch, Info, Shield, Zap, Wrench, Brain, Loader2, CheckCircle2 } from 'lucide-react';
import type { WorkflowEventType } from '@/lib/workflow/orchestrate';

type StepState = 'pending' | 'running' | 'done' | 'error';

type StepEntry = {
  key: string;
  label: string;
  state: StepState;
  detail?: string;
};

function buildSteps(events: WorkflowEventType[]): StepEntry[] {
  const stateMap = new Map<string, StepState>();
  const detailMap = new Map<string, string>();

  for (const ev of events) {
    if (ev.type === 'step') {
      stateMap.set(ev.name, ev.status === 'running' ? 'running' : ev.status === 'done' ? 'done' : 'error');
      if (ev.status === 'done' && ev.data && ev.name === 'extractMetadata') {
        const d = ev.data as { lang?: string; lines?: number };
        detailMap.set(ev.name, `${d.lang ?? '?'} · ${d.lines ?? '?'} lines`);
      }
    }
    if (ev.type === 'agent') {
      const key = `agent-${ev.name}`;
      stateMap.set(key, ev.status === 'running' ? 'running' : ev.status === 'done' ? 'done' : 'error');
      if (ev.status === 'done' && ev.findings) {
        detailMap.set(key, `${ev.findings.length} finding${ev.findings.length !== 1 ? 's' : ''}`);
      }
    }
  }

  const steps: StepEntry[] = [
    { key: 'parseInput', label: 'Parse input' },
    { key: 'extractMetadata', label: 'Extract metadata' },
    { key: 'agent-security', label: 'Security agent' },
    { key: 'agent-performance', label: 'Performance agent' },
    { key: 'agent-maintainability', label: 'Maintainability agent' },
    { key: 'supervisor', label: 'Supervisor' },
  ].map((s) => ({
    ...s,
    state: stateMap.get(s.key) ?? 'pending',
    detail: detailMap.get(s.key),
  }));

  return steps;
}

const stateColors: Record<StepState, string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  done: 'bg-green-500/10 text-green-600 dark:text-green-400',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const stateLabels: Record<StepState, string> = {
  pending: 'Pending',
  running: 'Running',
  done: 'Done',
  error: 'Error',
};

// Step icon lookup by key
const stepIcons: Record<string, React.ElementType> = {
  parseInput: FileSearch,
  extractMetadata: Info,
  'agent-security': Shield,
  'agent-performance': Zap,
  'agent-maintainability': Wrench,
  supervisor: Brain,
};

type Props = { events: WorkflowEventType[]; status?: 'idle' | 'streaming' | 'done' | 'error' };

export function WorkflowProgress({ events, status }: Props) {
  if (events.length === 0) return null;

  const steps = buildSteps(events);
  const isStreaming = status === 'streaming';
  const isDone = status === 'done';

  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Workflow</h2>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
            <Loader2 className="h-3 w-3 animate-spin" />
            Analyzing...
          </span>
        )}
        {isDone && (
          <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Analysis complete
          </span>
        )}
      </div>

      <div className="space-y-1">
        {steps.map((step, idx) => {
          const Icon = stepIcons[step.key];
          return (
            <div
              key={step.key}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm animate-slide-up"
              style={{
                // animationDelay cannot be expressed as a Tailwind class with a dynamic value;
                // inline style is intentional, not an oversight.
                animationDelay: `${idx * 60}ms`,
              }}
            >
              <div className="flex items-center gap-2">
                {/* Step icon */}
                {Icon && (
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="font-medium">{step.label}</span>
              </div>

              <div className="flex items-center gap-2">
                {step.detail && (
                  <span className="text-xs text-muted-foreground">{step.detail}</span>
                )}
                {/* Animated spinner replaces badge while running */}
                {step.state === 'running' ? (
                  <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    <span>Running</span>
                  </span>
                ) : (
                  <Badge className={stateColors[step.state]}>{stateLabels[step.state]}</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
