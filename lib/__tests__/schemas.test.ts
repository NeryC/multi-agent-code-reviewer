import { describe, it, expect } from 'vitest';
import { FindingSchema, ReviewReportSchema } from '../schemas';

describe('FindingSchema', () => {
  const valid = {
    severity: 'high',
    category: 'security',
    title: 'SQL injection risk',
    description: 'User input not sanitized.',
    suggestion: 'Use parameterized queries.',
  };

  it('accepts a valid finding without optional fields', () => {
    expect(() => FindingSchema.parse(valid)).not.toThrow();
  });

  it('accepts a finding with all optional fields', () => {
    const full = {
      ...valid,
      line: 42,
      codeExample: { before: 'exec(query)', after: 'exec(query, params)' },
    };
    expect(() => FindingSchema.parse(full)).not.toThrow();
  });

  it('rejects an unknown severity', () => {
    expect(() => FindingSchema.parse({ ...valid, severity: 'super-critical' })).toThrow();
  });

  it('rejects an unknown category', () => {
    expect(() => FindingSchema.parse({ ...valid, category: 'ux' })).toThrow();
  });
});

describe('ReviewReportSchema', () => {
  it('accepts a valid report', () => {
    const report = {
      score: 72,
      summary: 'Several medium issues found.',
      recommendation: 'Fix SQL injection before shipping.',
      findings: [],
    };
    expect(() => ReviewReportSchema.parse(report)).not.toThrow();
  });

  it('rejects score outside 0-100', () => {
    expect(() => ReviewReportSchema.parse({
      score: 150, summary: '', recommendation: '', findings: []
    })).toThrow();
  });
});
