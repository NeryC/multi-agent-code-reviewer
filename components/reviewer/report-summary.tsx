import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FindingCard } from './finding-card';
import type { ReviewReport } from '@/lib/schemas';

function ScoreGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? '#16a34a' : score >= 60 ? '#ca8a04' : score >= 40 ? '#ea580c' : '#dc2626';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="70" textAnchor="middle" dominantBaseline="central" fontSize="28" fontWeight="bold" fill={color}>
          {score}
        </text>
        <text x="70" y="92" textAnchor="middle" fontSize="11" fill="#6b7280">
          / 100
        </text>
      </svg>
    </div>
  );
}

type Props = { report: ReviewReport };

export function ReportSummary({ report }: Props) {
  const byCategory = {
    security: report.findings.filter((f) => f.category === 'security'),
    performance: report.findings.filter((f) => f.category === 'performance'),
    maintainability: report.findings.filter((f) => f.category === 'maintainability'),
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Review Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge score={report.score} />
            <div className="space-y-2 flex-1">
              <p className="text-sm">{report.summary}</p>
              <p className="text-sm font-medium border-l-4 border-primary pl-3">
                {report.recommendation}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {(
              [
                ['security', '🔒'],
                ['performance', '⚡'],
                ['maintainability', '🔧'],
              ] as const
            ).map(([cat, icon]) => (
              <div key={cat} className="rounded-md border p-2">
                <div className="text-lg">{icon}</div>
                <div className="font-bold text-base">{byCategory[cat].length}</div>
                <div className="text-muted-foreground capitalize">{cat}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({report.findings.length})</TabsTrigger>
          <TabsTrigger value="security">🔒 {byCategory.security.length}</TabsTrigger>
          <TabsTrigger value="performance">⚡ {byCategory.performance.length}</TabsTrigger>
          <TabsTrigger value="maintainability">🔧 {byCategory.maintainability.length}</TabsTrigger>
        </TabsList>
        {(['all', 'security', 'performance', 'maintainability'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-3 mt-3">
            {(tab === 'all' ? report.findings : byCategory[tab]).map((finding, i) => (
              <FindingCard key={`${finding.category}-${finding.title}-${i}`} finding={finding} />
            ))}
            {(tab === 'all' ? report.findings : byCategory[tab]).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No findings in this category.</p>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
