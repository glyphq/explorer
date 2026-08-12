import { expect, test } from "bun:test";

import { EXPLORER_FRAME_CONTENT_CLASS } from "../primitives";

test("Explorer data frame uses the widened content layout", () => {
  expect(EXPLORER_FRAME_CONTENT_CLASS).toContain("w-full");
  expect(EXPLORER_FRAME_CONTENT_CLASS).toContain("max-w-screen-2xl");
});
