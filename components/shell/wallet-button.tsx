import { Wallet01Icon } from "@hugeicons/core-free-icons";

import { GlyphButton } from "@/components/ui/button";

type WalletButtonProps = {
  label?: string;
  onConnect?: () => void;
};

export function WalletButton({
  label = "Connect wallet",
  onConnect,
}: WalletButtonProps) {
  return (
    <GlyphButton
      data-glyph-slot="wallet-sign-in"
      icon={Wallet01Icon}
      onClick={onConnect}
      size="sm"
      aria-label={label}
    >
      {label}
    </GlyphButton>
  );
}
