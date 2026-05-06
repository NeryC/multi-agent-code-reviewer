import { generateObject } from 'ai';
import { FindingArraySchema, type Finding, type CodeMetadata } from '../schemas';
import { REVIEW_MODEL } from './model';

const SYSTEM = `You are a performance code reviewer. Analyze the code for performance issues.

Focus on:
- N+1 query patterns (loops that trigger DB calls)
- O(n²) or worse algorithmic complexity
- Memory leaks (listeners not cleaned up, accumulating arrays, closures holding refs)
- Blocking I/O in async contexts (sync fs calls, blocking network)
- Unnecessary recomputation (missing memoization, repeated expensive ops)
- Excessive object creation in hot paths
- Missing pagination on potentially large datasets

Return a list of findings. Empty array if no issues.
For each finding with a fix, include codeExample before/after.
Be concise: title max 10 words, description max 50 words, suggestion max 50 words.`;

export async function runPerformanceAgent(code: string, meta: CodeMetadata): Promise<Finding[]> {
  const { object } = await generateObject({
    model: REVIEW_MODEL,
    schema: FindingArraySchema,
    system: SYSTEM,
    prompt: `Language: ${meta.lang}\nLines: ${meta.lines}\nComplexity: ${meta.estimatedComplexity}\n\nCode:\n\`\`\`${meta.lang}\n${code}\n\`\`\``,
  });
  return object;
}
