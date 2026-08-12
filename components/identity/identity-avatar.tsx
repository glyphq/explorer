import { useId, type CSSProperties } from "react";

import {
  getWalletMarbleParts,
  MARBLE_VIEWBOX,
  MONOCHROME_MARBLE_COLORS,
} from "./marble";

export interface IdentityAvatarProps {
  identity: string;
  size?: number;
  radius?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

function layerTransform({ translateX, translateY, rotate }: ReturnType<typeof getWalletMarbleParts>[number]): string {
  return `translate(${translateX} ${translateY}) rotate(${rotate} ${MARBLE_VIEWBOX / 2} ${MARBLE_VIEWBOX / 2})`;
}

/**
 * Wallet-compatible identity marble with Explorer's monochrome treatment.
 * The outer clipping radius follows Wallet's Identicon wrapper behavior.
 */
export function IdentityAvatar({
  identity,
  size = 40,
  radius = 10,
  label = `Identity identicon for ${identity}`,
  className,
  style,
}: IdentityAvatarProps) {
  const maskId = useId();
  const parts = getWalletMarbleParts(identity, MONOCHROME_MARBLE_COLORS);

  return (
    <span
      aria-label={label}
      className={className}
      role="img"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: "inline-flex",
        flexShrink: 0,
        overflow: "hidden",
        ...style,
      }}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        fill="none"
        height={size}
        viewBox={`0 0 ${MARBLE_VIEWBOX} ${MARBLE_VIEWBOX}`}
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={MARBLE_VIEWBOX} height={MARBLE_VIEWBOX}>
          <rect
            fill="#FFFFFF"
            height={MARBLE_VIEWBOX}
            rx={MARBLE_VIEWBOX * 2}
            width={MARBLE_VIEWBOX}
          />
        </mask>
        <g mask={`url(#${maskId})`}>
          <rect fill={parts[0].color} height={MARBLE_VIEWBOX} width={MARBLE_VIEWBOX} />
          <rect
            fill={parts[1].color}
            height={parts[1].isSquare ? MARBLE_VIEWBOX : MARBLE_VIEWBOX / 8}
            transform={layerTransform(parts[1])}
            width={MARBLE_VIEWBOX}
            x={(MARBLE_VIEWBOX - 60) / 2}
            y={(MARBLE_VIEWBOX - 20) / 2}
          />
          <circle
            cx={MARBLE_VIEWBOX / 2}
            cy={MARBLE_VIEWBOX / 2}
            fill={parts[2].color}
            r={MARBLE_VIEWBOX / 5}
            transform={`translate(${parts[2].translateX} ${parts[2].translateY})`}
          />
          <line
            stroke={parts[3].color}
            strokeWidth="2"
            transform={layerTransform(parts[3])}
            x1="0"
            x2={MARBLE_VIEWBOX}
            y1={MARBLE_VIEWBOX / 2}
            y2={MARBLE_VIEWBOX / 2}
          />
        </g>
      </svg>
    </span>
  );
}
