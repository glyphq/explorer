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

  const controller = new AbortController();
  let timedOut = false;
  let settled = false;
  let rejectCallerAbort: ((reason?: unknown) => void) | undefined;

  const abortFromCaller = () => {
    controller.abort();
    rejectCallerAbort?.(createAbortedError(context.endpoint, context.signal?.reason));
  };
  context.signal?.addEventListener("abort", abortFromCaller, { once: true });

  let rejectTimeout: ((reason?: unknown) => void) | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    rejectTimeout = reject;
  });
  const callerAbortPromise = context.signal
    ? new Promise<never>((_, reject) => {
        rejectCallerAbort = reject;
      })
    : null;
  const timeoutId = setTimeout(() => {
    if (settled) return;
    timedOut = true;
    controller.abort();
    rejectTimeout?.(createTimeoutError(context.endpoint, timeoutMs));
  }, timeoutMs);

  try {
    const operationPromise = operation(controller.signal);
    const result = await Promise.race([
      operationPromise,
      timeoutPromise,
      ...(callerAbortPromise ? [callerAbortPromise] : []),
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
    context.signal?.removeEventListener("abort", abortFromCaller);
  }
}
