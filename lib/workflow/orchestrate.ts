import { extractMetadata } from '../metadata';
import { fetchGitHubFile } from '../github';
import { runSecurityAgent } from '../agent/security';
import { runPerformanceAgent } from '../agent/performance';
import { runMaintainabilityAgent } from '../agent/maintainability';
import { runSupervisorAgent } from '../agent/supervisor';
import type { Finding, ReviewReport } from '../schemas';

export type WorkflowEventType =
  | { type: 'started'; jobId: string }
  | { type: 'step'; name: string; status: 'running' | 'done' | 'error'; data?: unknown }
  | { type: 'agent'; name: 'security' | 'performance' | 'maintainability'; status: 'running' | 'done' | 'error'; findings?: Finding[] }
  | { type: 'report'; report: ReviewReport }
  | { type: 'error'; message: string }
  | { type: 'done' };

export type SendEvent = (event: WorkflowEventType) => void;

export type ReviewInput =
  | { inputType: 'snippet'; value: string }
  | { inputType: 'github-url'; value: string };

export async function orchestrate(send: SendEvent, input: ReviewInput): Promise<void> {
  const jobId = crypto.randomUUID();
  send({ type: 'started', jobId });

  // Step 1: Parse input
  send({ type: 'step', name: 'parseInput', status: 'running' });
  const code =
    input.inputType === 'github-url'
      ? await fetchGitHubFile(input.value)
      : input.value;
  send({ type: 'step', name: 'parseInput', status: 'done' });

  // Step 2: Extract metadata
  send({ type: 'step', name: 'extractMetadata', status: 'running' });
  const meta = extractMetadata(code);
  send({ type: 'step', name: 'extractMetadata', status: 'done', data: meta });

  // Step 3: 3 agents in parallel — announce all as running BEFORE awaiting
  send({ type: 'agent', name: 'security', status: 'running' });
  send({ type: 'agent', name: 'performance', status: 'running' });
  send({ type: 'agent', name: 'maintainability', status: 'running' });

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

  // Step 4: Supervisor
  send({ type: 'step', name: 'supervisor', status: 'running' });
  const report = await runSupervisorAgent(
    [...secFindings, ...perfFindings, ...maintFindings],
    meta,
  );
  send({ type: 'step', name: 'supervisor', status: 'done' });

  // Done
  send({ type: 'report', report });
  send({ type: 'done' });
}
