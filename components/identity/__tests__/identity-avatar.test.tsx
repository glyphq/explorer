import { describe, expect, test } from "bun:test";
import Avatar from "boring-avatars";

import { IdentityAvatar } from "../identity-avatar";

const IDENTITY = "A".repeat(60);
const MARBLE_COLORS = ["#ccfcfb", "#7dd3fc", "#6ee7b7", "#fbbf24", "#a78bfa", "#f87171"];

describe("IdentityAvatar Wallet parity", () => {
  test("renders Wallet's boring-avatars marble props and accessible label", () => {
    const rendered = IdentityAvatar({ identity: IDENTITY });
    const avatar = rendered.props.children;

    expect(rendered.type).toBe("div");
    expect(rendered.props).toMatchObject({
      "aria-label": `Identity identicon for ${IDENTITY}`,
      role: "img",
      style: {
        width: 32,
        height: 32,
        borderRadius: 4,
        overflow: "hidden",
        flexShrink: 0,
      },
    });
    expect(avatar.type).toBe(Avatar);
    expect(avatar.props).toEqual({
      size: 32,
      name: IDENTITY,
      variant: "marble",
      colors: MARBLE_COLORS,
      square: false,
    });

    expect(IdentityAvatar({ identity: IDENTITY, label: "Sender identicon" }).props["aria-label"]).toBe(
      "Sender identicon",
    );
  });
});
