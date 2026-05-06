import type { CodeMetadata } from './schemas';

function detectLanguage(code: string): string {
  if (code.includes('def ') && code.includes(':') && !code.includes('=>')) return 'python';
  if (code.includes('fn ') && code.includes('->') && code.includes('let ')) return 'rust';
  if (code.includes('public static void main')) return 'java';
  if (/SELECT\s+\w|FROM\s+\w/i.test(code)) return 'sql';
  if (code.includes(': string') || code.includes(': number') || code.includes('interface ') || code.includes('<T>')) return 'typescript';
  if (code.includes('import React') || code.includes('jsx') || code.includes('tsx')) return 'tsx';
  return 'javascript';
}

export function extractMetadata(code: string): CodeMetadata {
  const lines = code.split('\n').length;
  return {
    lang: detectLanguage(code),
    lines,
    estimatedComplexity: lines > 200 ? 'high' : lines > 50 ? 'medium' : 'low',
  };
}
