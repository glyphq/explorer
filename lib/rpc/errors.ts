import { QubicRpcError } from "@qubic.org/rpc";

export type ExplorerRpcErrorKind =
  | "aborted"
  | "timeout"
  | "network"
  | "http"
  | "invalid-response"
  | "validation"
  | "unknown";

export interface ExplorerRpcErrorInit {
  readonly kind: ExplorerRpcErrorKind;
  readonly endpoint: string;
  readonly status?: number;
  readonly retryable?: boolean;
  readonly cause?: unknown;
}

const MAX_ERROR_MESSAGE_LENGTH = 240;

function safeMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "The RPC request failed.";

  return message.replace(/\s+/g, " ").trim().slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

export class ExplorerRpcError extends Error {
  readonly code = "EXPLORER_RPC_ERROR" as const;
  readonly kind: ExplorerRpcErrorKind;
  readonly endpoint: string;
  readonly status?: number;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(message: string, init: ExplorerRpcErrorInit) {
    super(message);
    this.name = "ExplorerRpcError";
    this.kind = init.kind;
    this.endpoint = init.endpoint;
    this.status = init.status;
    this.retryable = init.retryable ?? false;
    this.cause = init.cause;
  }
}

export class ExplorerInputError extends Error {
  readonly code = "EXPLORER_INPUT_ERROR" as const;
  readonly field: string;

  constructor(field: string, message = `Invalid ${field}.`) {
    super(message);
    this.name = "ExplorerInputError";
    this.field = field;
  }
}

export function isExplorerRpcError(error: unknown): error is ExplorerRpcError {
  return error instanceof ExplorerRpcError;
}

export function createTimeoutError(
  endpoint: string,
  timeoutMs: number,
  cause?: unknown,
): ExplorerRpcError {
  return new ExplorerRpcError(`RPC request timed out after ${timeoutMs}ms.`, {
    kind: "timeout",
    endpoint,
    retryable: true,
    cause,
  });
}

export function createAbortedError(endpoint: string, cause?: unknown): ExplorerRpcError {
  return new ExplorerRpcError("RPC request was aborted.", {
    kind: "aborted",
    endpoint,
    retryable: false,
    cause,
  });
}

export function normalizeRpcError(
  error: unknown,
  endpoint: string,
): ExplorerRpcError {
  if (isExplorerRpcError(error)) return error;

  if (error instanceof QubicRpcError) {
    const kind: ExplorerRpcErrorKind =
      error.status === -2
        ? "invalid-response"
        : error.status === -1
          ? "network"
          : "http";

    return new ExplorerRpcError(safeMessage(error), {
      kind,
      endpoint,
      status: error.status,
      retryable: error.status === -1 || error.status === 408 || error.status === 429 || error.status >= 500,
      cause: error,
    });
  }

  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return createAbortedError(endpoint, error);
  }

  if (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return error.name === "TimeoutError"
      ? createTimeoutError(endpoint, 0, error)
      : createAbortedError(endpoint, error);
  }

  return new ExplorerRpcError(safeMessage(error), {
    kind: error instanceof TypeError ? "network" : "unknown",
    endpoint,
    retryable: error instanceof TypeError,
    cause: error,
  });
}

export function unwrapRpcResult<T, E>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E },
  endpoint: string,
): T {
  if (result.ok) return result.value;
  throw normalizeRpcError(result.error, endpoint);
}
