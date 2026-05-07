import { Badge } from '@/components/ui/badge';
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
  running: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse',
  done: 'bg-green-500/10 text-green-600 dark:text-green-400',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const stateLabels: Record<StepState, string> = {
  pending: 'Pending',
  running: 'Running',
  done: 'Done',
  error: 'Error',
};

type Props = { events: WorkflowEventType[] };

export function WorkflowProgress({ events }: Props) {
  if (events.length === 0) return null;

  const steps = buildSteps(events);

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Workflow</h2>
      <div className="space-y-1">
        {steps.map((step) => (
          <div
            key={step.key}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
          >
            <span className="font-medium">{step.label}</span>
            <div className="flex items-center gap-2">
              {step.detail && (
                <span className="text-xs text-muted-foreground">{step.detail}</span>
              )}
              <Badge className={stateColors[step.state]}>{stateLabels[step.state]}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
