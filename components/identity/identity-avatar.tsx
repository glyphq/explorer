import type { CSSProperties } from "react";
import Avatar from "boring-avatars";

const MARBLE_COLORS = ["#ccfcfb", "#7dd3fc", "#6ee7b7", "#fbbf24", "#a78bfa", "#f87171"];

export interface IdentityAvatarProps {
  identity: string;
  size?: number;
  radius?: number;
  padding?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function IdentityAvatar({
  identity,
  size = 32,
  radius = 4,
  padding = 2,
  label = `Identity identicon for ${identity}`,
  className,
  style,
}: IdentityAvatarProps) {
  // Wallet keeps this shared default for identity badges but does not apply it in this branch.
  void padding;

  return (
    <div
      aria-label={label}
      className={className}
      role="img"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
    >
      <Avatar
        size={size}
        name={identity}
        variant="marble"
        colors={MARBLE_COLORS}
        square={false}
      />
    </div>
  );
}
