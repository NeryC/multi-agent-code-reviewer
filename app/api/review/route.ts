import { rateLimit } from '@/lib/rate-limit';
import { orchestrate, type ReviewInput } from '@/lib/workflow/orchestrate';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limit = rateLimit(ip, { max: 3, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return new Response('Rate limit exceeded. Try again in 1 hour.', { status: 429 });
  }

  let body: ReviewInput;
  try {
    body = await req.json() as ReviewInput;
    if (!body.inputType || !body.value) throw new Error('missing fields');
    if (body.inputType !== 'snippet' && body.inputType !== 'github-url') throw new Error('invalid inputType');
  } catch {
    return new Response('Invalid request body. Provide { inputType, value }.', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await orchestrate(send, body);
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
