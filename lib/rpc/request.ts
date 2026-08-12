import type { Result } from "@qubic.org/rpc";

import {
  createAbortedError,
  createTimeoutError,
  normalizeRpcError,
  unwrapRpcResult,
} from "./errors";

export const DEFAULT_REQUEST_TIMEOUT_MS = 8_500;

export interface RpcRequestOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

export async function executeRpcRequest<T, E>(
  operation: (signal: AbortSignal) => Promise<Result<T, E>>,
  context: { readonly endpoint: string } & RpcRequestOptions,
): Promise<T> {
  const timeoutMs =
    Number.isFinite(context.timeoutMs) && (context.timeoutMs ?? 0) > 0
      ? Math.floor(context.timeoutMs as number)
      : DEFAULT_REQUEST_TIMEOUT_MS;

  if (context.signal?.aborted) {
    throw createAbortedError(context.endpoint, context.signal.reason);
  }

  const timeoutController = new AbortController();
  const signal = context.signal
    ? AbortSignal.any([context.signal, timeoutController.signal])
    : timeoutController.signal;
  let timedOut = false;
  let settled = false;

  let rejectTimeout: ((reason?: unknown) => void) | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    rejectTimeout = reject;
  });
  const timeoutId = setTimeout(() => {
    if (settled) return;
    timedOut = true;
    timeoutController.abort();
    rejectTimeout?.(createTimeoutError(context.endpoint, timeoutMs));
  }, timeoutMs);

  try {
    const operationPromise = operation(signal);
    const result = await Promise.race([
      operationPromise,
      timeoutPromise,
    ]);
    if (timedOut) throw createTimeoutError(context.endpoint, timeoutMs);
    if (context.signal?.aborted) {
      throw createAbortedError(context.endpoint, context.signal.reason);
    }
    return unwrapRpcResult(result, context.endpoint);
  } catch (error) {
    if (timedOut) throw createTimeoutError(context.endpoint, timeoutMs, error);
    if (context.signal?.aborted) {
      throw createAbortedError(context.endpoint, context.signal.reason ?? error);
    }
    throw normalizeRpcError(error, context.endpoint);
  } finally {
    settled = true;
    clearTimeout(timeoutId);
  }
}
