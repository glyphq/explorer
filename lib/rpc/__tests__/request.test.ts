import { describe, expect, test } from "bun:test";

import { QubicRpcError, err, ok } from "@qubic.org/rpc";

import { executeRpcRequest } from "../request";

describe("RPC request boundary", () => {
  test("unwraps successful Result values", async () => {
    const value = await executeRpcRequest(
      async () => ok({ tick: 123 }),
      { endpoint: "/test", timeoutMs: 100 },
    );

    expect(value).toEqual({ tick: 123 });
  });

  test("normalizes Qubic Result errors into safe retry metadata", async () => {
    const promise = executeRpcRequest(
      async () => err(new QubicRpcError(503, "/test", "upstream unavailable")),
      { endpoint: "/test", timeoutMs: 100 },
    );

    await expect(promise).rejects.toMatchObject({
      kind: "http",
      endpoint: "/test",
      status: 503,
      retryable: true,
    });
  });

  test("times out even when an operation ignores AbortSignal", async () => {
    const promise = executeRpcRequest(
      async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        return ok("late");
      },
      { endpoint: "/slow", timeoutMs: 10 },
    );

    await expect(promise).rejects.toMatchObject({
      kind: "timeout",
      endpoint: "/slow",
      retryable: true,
    });
  });

  test("aborts promptly when the caller aborts", async () => {
    const controller = new AbortController();
    const promise = executeRpcRequest(
      async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        return ok("late");
      },
      { endpoint: "/abort", signal: controller.signal, timeoutMs: 100 },
    );

    controller.abort();
    await expect(promise).rejects.toMatchObject({
      kind: "aborted",
      endpoint: "/abort",
    });
  });
});
