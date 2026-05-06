import { generateObject } from 'ai';
import { FindingArraySchema, type Finding, type CodeMetadata } from '../schemas';
import { REVIEW_MODEL } from './model';

const SYSTEM = `You are a code maintainability reviewer. Analyze the code for maintainability issues.

Focus on:
- Unclear variable or function names (single letters, generic names like "data", "temp")
- Functions doing more than one thing (high cyclomatic complexity, mixed concerns)
- Code duplication (copy-pasted blocks that should be extracted)
- Deeply nested conditionals that can be flattened
- Missing or misleading comments on non-obvious logic
- Magic numbers or strings without named constants
- Tight coupling that makes the code hard to test or change

Return a list of findings. Empty array if no issues.
For each finding, include codeExample before/after when a concrete refactor applies.
Be concise: title max 10 words, description max 50 words, suggestion max 50 words.`;

export async function runMaintainabilityAgent(code: string, meta: CodeMetadata): Promise<Finding[]> {
  const { object } = await generateObject({
    model: REVIEW_MODEL,
    schema: FindingArraySchema,
    system: SYSTEM,
    prompt: `Language: ${meta.lang}\nLines: ${meta.lines}\n\nCode:\n\`\`\`${meta.lang}\n${code}\n\`\`\``,
  });
  return object;
}
