import type { CodeMetadata } from './schemas';

function detectLanguage(code: string): string {
  // PHP — distinctive opening tag
  if (code.includes('<?php')) return 'php';

  // C / C++ — header includes
  if (code.includes('#include') && (code.includes('<stdio.h>') || code.includes('<iostream>')))
    return 'c++';

  // Go — package declaration or fmt usage
  if (code.includes('package main') || (code.includes('func ') && code.includes('fmt.')))
    return 'go';

  // Swift — Foundation import or typed variable declarations
  if (code.includes('import Foundation') || (code.includes('var ') && code.includes(': String')))
    return 'swift';

  // Python — function definitions with colon (no arrow functions)
  if (code.includes('def ') && code.includes(':') && !code.includes('=>')) return 'python';

  // Rust — fn with return type and let bindings
  if (code.includes('fn ') && code.includes('->') && code.includes('let ')) return 'rust';

  // Java — main method signature
  if (code.includes('public static void main')) return 'java';

  // SQL — SELECT / FROM keywords
  if (/SELECT\s+\w|FROM\s+\w/i.test(code)) return 'sql';

  // TypeScript — type annotations or generics
  if (
    code.includes(': string') ||
    code.includes(': number') ||
    code.includes('interface ') ||
    code.includes('<T>')
  )
    return 'typescript';

  // TSX / JSX — React import or file extension hints
  if (code.includes('import React') || code.includes('.jsx') || code.includes('.tsx'))
    return 'tsx';

  // Default to JavaScript
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
