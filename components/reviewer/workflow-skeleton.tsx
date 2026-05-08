/**
 * WorkflowSkeleton — 6 shimmer rows that mimic the shape of workflow step
 * rows while waiting for the first SSE event to arrive.
 */
const SKELETON_LABELS = [
  'Parse input',
  'Extract metadata',
  'Security agent',
  'Performance agent',
  'Maintainability agent',
  'Supervisor',
];

export function WorkflowSkeleton() {
  return (
    <div className="space-y-2 animate-fade-in" role="status" aria-label="Preparing analysis…">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Workflow</h2>
        <span className="text-xs text-muted-foreground animate-pulse">
          Starting agents…
        </span>
      </div>
      <div className="space-y-1">
        {SKELETON_LABELS.map((label, i) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-md border px-3 py-2"
          >
            {/* Left: icon placeholder + label placeholder */}
            <div className="flex items-center gap-2">
              <div
                className="skeleton h-4 w-4 rounded"
                style={{
                  // animationDelay cannot be expressed as a Tailwind class with a dynamic value;
                  // inline style is intentional, not an oversight.
                  animationDelay: `${i * 80}ms`,
                }}
              />
              <div
                className="skeleton h-3 rounded"
                style={{
                  width: `${80 + (i % 3) * 24}px`,
                  animationDelay: `${i * 80}ms`,
                }}
              />
            </div>
            {/* Right: badge placeholder */}
            <div
              className="skeleton h-5 w-14 rounded-full"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
