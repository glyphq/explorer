import { describe, expect, test } from "bun:test";

import { DitherAvatar } from "@/components/dither-kit/avatar";
import { IdentityAvatar } from "../identity-avatar";

const IDENTITY = "A".repeat(60);

describe("IdentityAvatar", () => {
  test("renders a deterministic Dither Kit avatar with the requested accessible label", () => {
    const rendered = IdentityAvatar({ identity: IDENTITY });

    expect(rendered.type).toBe(DitherAvatar);
    expect(rendered.props).toMatchObject({
      animate: false,
      label: `Identity identicon for ${IDENTITY}`,
      name: IDENTITY,
      size: 32,
      style: {
        borderRadius: 4,
        overflow: "hidden",
        flexShrink: 0,
      },
    });
    expect(rendered.props.hue).toBeUndefined();

    expect(IdentityAvatar({ identity: IDENTITY, label: "Sender identicon" }).props.label).toBe(
      "Sender identicon",
    );
  });
});
