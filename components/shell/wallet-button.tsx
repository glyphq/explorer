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
      onClick={onConnect}
      size="sm"
      aria-label={label}
    >
      {label}
    </GlyphButton>
  );
}
