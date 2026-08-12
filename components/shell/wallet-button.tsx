import { Wallet01Icon } from "@hugeicons/core-free-icons";

import { GlyphButton } from "@/components/ui/button";

type WalletButtonProps = {
  label?: string;
  compactLabel?: string;
  onConnect?: () => void;
};

export function WalletButton({
  label = "Connect wallet",
  compactLabel = "Connect",
  onConnect,
}: WalletButtonProps) {
  return (
    <GlyphButton
      data-glyph-slot="wallet-sign-in"
      className="glyph-wallet-button"
      icon={Wallet01Icon}
      onClick={onConnect}
      size="sm"
      aria-label={label}
      title={label}
    >
      <span className="glyph-wallet-button__full-label">{label}</span>
      <span aria-hidden="true" className="glyph-wallet-button__compact-label">{compactLabel}</span>
    </GlyphButton>
  );
}
