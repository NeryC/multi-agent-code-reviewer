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

  it('detects php from "<?php"', () => {
    const code = '<?php echo "hello";';
    expect(extractMetadata(code).lang).toBe('php');
  });

  it('detects c++ from "#include <iostream>"', () => {
    const code = '#include <iostream>\nint main() { return 0; }';
    expect(extractMetadata(code).lang).toBe('c++');
  });

  it('detects go from "package main" + "func main()"', () => {
    const code = 'package main\n\nfunc main() {\n}';
    expect(extractMetadata(code).lang).toBe('go');
  });

  it('detects swift from "import Foundation"', () => {
    const code = 'import Foundation\n\nlet x = 1';
    expect(extractMetadata(code).lang).toBe('swift');
  });

  it('does not detect typescript "var x: string" as swift', () => {
    const code = 'var x: string = "hello";';
    expect(extractMetadata(code).lang).toBe('typescript');
  });

  it('classifies high complexity for >200 lines', () => {
    const code = Array(201).fill('x').join('\n');
    expect(extractMetadata(code).estimatedComplexity).toBe('high');
  });
});
