import { describe, it, expect } from 'vitest';
import { extractMetadata } from '../metadata';

describe('extractMetadata', () => {
  it('counts lines correctly', () => {
    const code = 'line1\nline2\nline3';
    expect(extractMetadata(code).lines).toBe(3);
  });

  it('detects python from "def " + ":"', () => {
    const code = 'def foo():\n  return 42';
    expect(extractMetadata(code).lang).toBe('python');
  });

  it('detects typescript from ": string"', () => {
    const code = 'const x: string = "hello";';
    expect(extractMetadata(code).lang).toBe('typescript');
  });

  it('classifies high complexity for >200 lines', () => {
    const code = Array(201).fill('x').join('\n');
    expect(extractMetadata(code).estimatedComplexity).toBe('high');
  });
});
