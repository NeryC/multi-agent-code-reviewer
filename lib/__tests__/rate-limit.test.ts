import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, _resetForTests } from '../rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    _resetForTests();
    vi.useFakeTimers();
  });

  it('allows requests under the limit', () => {
    expect(rateLimit('1.2.3.4', { max: 3, windowMs: 60_000 }).allowed).toBe(true);
    expect(rateLimit('1.2.3.4', { max: 3, windowMs: 60_000 }).allowed).toBe(true);
    expect(rateLimit('1.2.3.4', { max: 3, windowMs: 60_000 }).allowed).toBe(true);
  });

  it('blocks once the limit is exceeded', () => {
    for (let i = 0; i < 3; i++) rateLimit('1.2.3.4', { max: 3, windowMs: 60_000 });
    expect(rateLimit('1.2.3.4', { max: 3, windowMs: 60_000 }).allowed).toBe(false);
  });

  it('resets after the window passes', () => {
    for (let i = 0; i < 3; i++) rateLimit('1.2.3.4', { max: 3, windowMs: 60_000 });
    vi.advanceTimersByTime(61_000);
    expect(rateLimit('1.2.3.4', { max: 3, windowMs: 60_000 }).allowed).toBe(true);
  });

  it('tracks separate buckets per key', () => {
    for (let i = 0; i < 3; i++) rateLimit('1.1.1.1', { max: 3, windowMs: 60_000 });
    expect(rateLimit('2.2.2.2', { max: 3, windowMs: 60_000 }).allowed).toBe(true);
  });
});
