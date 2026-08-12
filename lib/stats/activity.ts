import type { QueryTickData } from "@qubic.org/rpc";

export const MAX_RECENT_TICK_WINDOW_SIZE = 5;

export interface RecentTickActivity {
  tick: number;
  available: boolean;
  transactionCount: number | null;
}

export function createRecentTickWindow(
  lastProcessedTick: number | undefined,
  requestedSize = MAX_RECENT_TICK_WINDOW_SIZE,
): number[] {
  if (!Number.isSafeInteger(lastProcessedTick) || (lastProcessedTick ?? -1) < 0) return [];

  const size = Math.min(
    MAX_RECENT_TICK_WINDOW_SIZE,
    Math.max(1, Math.floor(requestedSize)),
  );
  const firstTick = Math.max(0, (lastProcessedTick as number) - size + 1);
  return Array.from(
    { length: (lastProcessedTick as number) - firstTick + 1 },
    (_, index) => firstTick + index,
  );
}

export function normalizeTickActivity(
  tick: number,
  data: QueryTickData | undefined,
): RecentTickActivity {
  return {
    tick,
    available: data !== undefined,
    transactionCount: Array.isArray(data?.transactionHashes) ? data.transactionHashes.length : null,
  };
}
