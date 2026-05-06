import { generateObject } from 'ai';
import { FindingArraySchema, type Finding, type CodeMetadata } from '../schemas';
import { REVIEW_MODEL } from './model';

const SYSTEM = `You are a security code reviewer. Analyze the provided code and identify security vulnerabilities.

Focus on:
- SQL injection, command injection, XSS vulnerabilities
- Hardcoded secrets, API keys, passwords
- Insecure deserialization or eval usage
- Missing input validation at system boundaries
- Dangerous use of user-controlled data
- Authentication or authorization flaws

Return a list of findings. If the code is secure, return an empty array.
For each finding with a code fix, include a codeExample with before/after.
Be concise: title max 10 words, description max 50 words, suggestion max 50 words.`;

export async function runSecurityAgent(code: string, meta: CodeMetadata): Promise<Finding[]> {
  const { object } = await generateObject({
    model: REVIEW_MODEL,
    schema: FindingArraySchema,
    system: SYSTEM,
    prompt: `Language: ${meta.lang}\nLines: ${meta.lines}\n\nCode to review:\n\`\`\`${meta.lang}\n${code}\n\`\`\``,
  });
  return object;
}
