import type { CSSProperties } from "react";
import { DitherAvatar } from "@/components/dither-kit/avatar";

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
    <DitherAvatar
      animate={false}
      className={className}
      hue={180}
      label={label}
      name={identity}
      size={size}
      style={{
        borderRadius: radius,
        flexShrink: 0,
        overflow: "hidden",
        ...style,
      }}
    />
  );
}
