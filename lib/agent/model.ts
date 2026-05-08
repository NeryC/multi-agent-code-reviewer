import { createGateway } from '@ai-sdk/gateway';

// Single authenticated gateway client — uses AI_GATEWAY_API_KEY from env
const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY!,
});

// REVIEW_MODEL: used for the 3 specialized agents (best reasoning for finding issues)
// SUPERVISOR_MODEL: used for the supervisor (synthesis + scoring, cheaper)
export const REVIEW_MODEL = gateway('anthropic/claude-sonnet-4.6');
export const SUPERVISOR_MODEL = gateway('anthropic/claude-haiku-4.5');
