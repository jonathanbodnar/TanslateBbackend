const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxPerMinute: number) {
  return async (key: string): Promise<boolean> => {
    const now = Date.now();
    const minute = 60 * 1000;
    const rec = buckets.get(key) ?? { count: 0, resetAt: now + minute };
    if (now > rec.resetAt) {
      rec.count = 0;
      rec.resetAt = now + minute;
    }
    rec.count += 1;
    buckets.set(key, rec);
    return rec.count <= maxPerMinute;
  };
}

