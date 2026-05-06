import { z } from 'zod';

export const FindingSchema = z.object({
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  category: z.enum(['security', 'performance', 'maintainability']),
  title: z.string(),
  line: z.number().int().positive().optional(),
  description: z.string(),
  suggestion: z.string(),
  codeExample: z
    .object({ before: z.string(), after: z.string() })
    .optional(),
});

export const FindingArraySchema = z.array(FindingSchema);

export const CodeMetadataSchema = z.object({
  lang: z.string(),
  lines: z.number().int().positive(),
  estimatedComplexity: z.enum(['low', 'medium', 'high']),
});

export const ReviewReportSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string(),
  recommendation: z.string(),
  findings: FindingArraySchema,
});

export type Finding = z.infer<typeof FindingSchema>;
export type FindingArray = z.infer<typeof FindingArraySchema>;
export type CodeMetadata = z.infer<typeof CodeMetadataSchema>;
export type ReviewReport = z.infer<typeof ReviewReportSchema>;
