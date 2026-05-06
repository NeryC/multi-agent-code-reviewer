import { generateObject } from 'ai';
import { ReviewReportSchema, type Finding, type ReviewReport, type CodeMetadata } from '../schemas';
import { SUPERVISOR_MODEL } from './model';

const SYSTEM = `You are a senior engineering lead synthesizing findings from 3 specialized code reviewers.

Your job:
1. Deduplicate findings that cover the same underlying issue (keep the most specific one)
2. Reprioritize: security > performance > maintainability when severity is equal
3. Write a 2-3 sentence executive summary (what the code does, overall quality)
4. Write a 1-sentence actionable recommendation (most important thing to fix first)
5. Assign a score 0-100: 90+ = production-ready, 70-89 = minor issues, 50-69 = needs work before shipping, <50 = significant problems

Return a ReviewReport with score, summary, recommendation, and the deduplicated+prioritized findings array.`;

export async function runSupervisorAgent(findings: Finding[], meta: CodeMetadata): Promise<ReviewReport> {
  const findingsJson = JSON.stringify(findings, null, 2);
  const { object } = await generateObject({
    model: SUPERVISOR_MODEL,
    schema: ReviewReportSchema,
    system: SYSTEM,
    prompt: `Code metadata: ${meta.lang}, ${meta.lines} lines, ${meta.estimatedComplexity} complexity\n\nRaw findings from 3 agents:\n${findingsJson}`,
  });
  return object;
}
