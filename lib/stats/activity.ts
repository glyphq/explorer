import type { QueryTickData } from "@qubic.org/rpc";

export const MAX_RECENT_TICK_WINDOW_SIZE = 100;
export const RECENT_TICK_ACTIVITY_CONCURRENCY = 8;

export type RecentTickActivityState = "loading" | "available" | "unavailable";

export interface RecentTickActivity {
  tick: number;
  available: boolean;
  transactionCount: number | null;
}

export type RecentTickActivityWithState = RecentTickActivity & {
  state: RecentTickActivityState;
};

export interface RecentTickActivityRequestLimiter {
  run<T>(
    signal: AbortSignal,
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T>;
}

interface QueuedRequest {
  signal: AbortSignal;
  operation: (signal: AbortSignal) => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  started: boolean;
  onAbort: () => void;
}

function abortReason(signal: AbortSignal): unknown {
  if (signal.reason !== undefined) return signal.reason;

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

export function createRecentTickActivityRequestLimiter(
  requestedConcurrency = RECENT_TICK_ACTIVITY_CONCURRENCY,
): RecentTickActivityRequestLimiter {
  const concurrency = Math.max(1, Math.floor(requestedConcurrency));
  const queue: QueuedRequest[] = [];
  let activeRequests = 0;

  function pump() {
    while (activeRequests < concurrency && queue.length > 0) {
      const request = queue.shift();
      if (!request) return;

      if (request.signal.aborted) {
        request.reject(abortReason(request.signal));
        continue;
      }

      request.started = true;
      request.signal.removeEventListener("abort", request.onAbort);
      activeRequests += 1;

      void Promise.resolve()
        .then(() => request.operation(request.signal))
        .then(request.resolve, request.reject)
        .finally(() => {
          activeRequests -= 1;
          pump();
        });
    }
  }

  return {
    run<T>(signal: AbortSignal, operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
      if (signal.aborted) return Promise.reject(abortReason(signal));

      return new Promise<T>((resolve, reject) => {
        const request: QueuedRequest = {
          signal,
          operation,
          resolve: resolve as (value: unknown) => void,
          reject,
          started: false,
          onAbort: () => {
            if (request.started) return;

            const queueIndex = queue.indexOf(request);
            if (queueIndex === -1) return;

            queue.splice(queueIndex, 1);
            signal.removeEventListener("abort", request.onAbort);
            reject(abortReason(signal));
          },
        };

        signal.addEventListener("abort", request.onAbort, { once: true });
        queue.push(request);
        pump();
      });
    },
  };
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

export function mapRecentTickActivityState(
  activity: RecentTickActivity,
  isPending: boolean,
): RecentTickActivityWithState {
  return {
    ...activity,
    state: isPending ? "loading" : activity.available ? "available" : "unavailable",
  };
}
