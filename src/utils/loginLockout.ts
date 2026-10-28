// In-memory brute-force protection, replacing your old
// getLockStatus / recordFailedAttempt / clearAttempts helpers.
// It lives in this process's memory only, so it resets on restart and isn't
// shared between servers. It moves to Redis in the caching phase.

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const attempts = new Map<string, AttemptRecord>();

// Keyed by business + email, so one tenant's failures don't lock
// the same email in another tenant.
function keyOf(email: string, businessId: number): string {
  return `${businessId}:${email}`;
}

export function getLockStatus(
  email: string,
  businessId: number,
): { isLocked: boolean; retryAfterSeconds: number } {
  const key = keyOf(email, businessId);
  const record = attempts.get(key);

  if (!record?.lockedUntil) return { isLocked: false, retryAfterSeconds: 0 };

  const remainingMs = record.lockedUntil - Date.now();
  if (remainingMs <= 0) {
    attempts.delete(key);
    return { isLocked: false, retryAfterSeconds: 0 };
  }

  return { isLocked: true, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
}

export function recordFailedAttempt(email: string, businessId: number): void {
  const key = keyOf(email, businessId);
  const now = Date.now();
  const existing = attempts.get(key);

  const record: AttemptRecord =
    existing && now - existing.firstAttemptAt < WINDOW_MS
      ? existing
      : { count: 0, firstAttemptAt: now, lockedUntil: null };

  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCK_MS;
  }

  attempts.set(key, record);
}

export function clearAttempts(email: string, businessId: number): void {
  attempts.delete(keyOf(email, businessId));
}

// Keys come from user input, so without cleanup an attacker could fill
// memory with junk emails. Sweep expired records every 5 minutes.
const sweep = setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of attempts) {
      const expiresAt = record.lockedUntil ?? record.firstAttemptAt + WINDOW_MS;
      if (expiresAt <= now) attempts.delete(key);
    }
  },
  5 * 60 * 1000,
);

// unref() so this timer never keeps the process alive during shutdown.
sweep.unref();
