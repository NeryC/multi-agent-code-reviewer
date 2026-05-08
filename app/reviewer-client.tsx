'use client';

import { useState, useCallback, useRef } from 'react';
import { CodeInput } from '@/components/reviewer/code-input';
import { WorkflowProgress } from '@/components/reviewer/workflow-progress';
import { WorkflowSkeleton } from '@/components/reviewer/workflow-skeleton';
import { ReportSummary } from '@/components/reviewer/report-summary';
import type { WorkflowEventType } from '@/lib/workflow/orchestrate';
import type { ReviewReport } from '@/lib/schemas';

type StreamStatus = 'idle' | 'streaming' | 'done' | 'error';

function useReviewStream() {
  const [events, setEvents] = useState<WorkflowEventType[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ref to the active AbortController so we can cancel in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const startReview = useCallback(async (inputType: 'snippet' | 'github-url', value: string) => {
    // Abort any previous in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setEvents([]);
    setReport(null);
    setErrorMsg(null);
    setStatus('streaming');

    try {
      let res: Response;
      try {
        res = await fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputType, value }),
          signal: controller.signal,
        });
      } catch (err) {
        // Ignore AbortError — it means we intentionally cancelled
        if (err instanceof Error && err.name === 'AbortError') return;
        setStatus('error');
        setErrorMsg('Network error — could not reach the server.');
        return;
      }

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(await res.text());
        return;
      }

      if (!res.body) {
        setStatus('error');
        setErrorMsg('No response body.');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;

        buffer += decoder.decode(chunk, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          const json = part.slice('data: '.length);
          let event: WorkflowEventType;
          try {
            event = JSON.parse(json);
          } catch {
            continue;
          }
          setEvents((prev) => [...prev, event]);
          if (event.type === 'report') setReport(event.report);
          if (event.type === 'done') setStatus('done');
          if (event.type === 'error') {
            setStatus('error');
            setErrorMsg(event.message);
          }
        }
      }
    } finally {
      // Clean up the ref when the stream finishes or errors
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  return { events, status, report, errorMsg, startReview };
}

export function ReviewerClient() {
  const { events, status, report, errorMsg, startReview } = useReviewStream();
  const isLoading = status === 'streaming';

  return (
    <div className="space-y-8">
      <CodeInput disabled={isLoading} onSubmit={startReview} />

      {status === 'error' && errorMsg && (
        <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {isLoading && events.length === 0 && <WorkflowSkeleton />}
      {events.length > 0 && <WorkflowProgress events={events} status={status} />}

      {report && <ReportSummary report={report} />}
    </div>
  );
}
