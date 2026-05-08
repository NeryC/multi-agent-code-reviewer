'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Finding } from '@/lib/schemas';
import dynamic from 'next/dynamic';

const ReactDiffViewer = dynamic(() => import('react-diff-viewer-continued'), { ssr: false });

const severityColors: Record<Finding['severity'], string> = {
  critical: 'bg-red-600/10 text-red-700 dark:text-red-400 border-red-300',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-300',
  low: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300',
  info: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-300',
};

// Left border accent color by severity
const severityBorderAccent: Record<Finding['severity'], string> = {
  critical: 'border-l-4 border-l-red-600',
  high: 'border-l-4 border-l-orange-500',
  medium: 'border-l-4 border-l-yellow-500',
  low: 'border-l-4 border-l-blue-500',
  info: 'border-l-4 border-l-gray-400',
};

const categoryIcon: Record<Finding['category'], string> = {
  security: '🔒',
  performance: '⚡',
  maintainability: '🔧',
};

const categoryAriaLabel: Record<Finding['category'], string> = {
  security: 'Security finding',
  performance: 'Performance finding',
  maintainability: 'Maintainability finding',
};

type Props = { finding: Finding };

export function FindingCard({ finding }: Props) {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <Card className={severityBorderAccent[finding.severity]}>
      <CardHeader className="py-3 pb-2">
        <CardTitle className="text-sm flex flex-wrap items-center gap-2">
          <span aria-label={categoryAriaLabel[finding.category]}>
            {categoryIcon[finding.category]}
          </span>
          <span className="flex-1">{finding.title}</span>
          {finding.line && (
            <span className="text-xs text-muted-foreground font-mono">line {finding.line}</span>
          )}
          <Badge className={severityColors[finding.severity]}>{finding.severity}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 space-y-2">
        <p className="text-sm text-muted-foreground">{finding.description}</p>
        <p className="text-sm">
          <span className="font-medium">Fix: </span>
          {finding.suggestion}
        </p>
        {finding.codeExample && (
          <div className="space-y-1">
            <button
              type="button"
              aria-expanded={showDiff}
              onClick={() => setShowDiff(!showDiff)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {showDiff ? 'Hide diff' : 'Show code example'}
            </button>
            {showDiff && (
              <div className="rounded overflow-hidden text-xs">
                <ReactDiffViewer
                  oldValue={finding.codeExample.before}
                  newValue={finding.codeExample.after}
                  splitView={false}
                  leftTitle="Before"
                  rightTitle="After"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
