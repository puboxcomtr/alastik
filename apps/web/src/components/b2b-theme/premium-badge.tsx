import { CrownIcon } from "./icons";

export function PremiumBadge() {
  return (
    <span className="premium-badge" title="Premium Cari">
      <CrownIcon size={13} />
      <span className="premium-badge-text">Premium Cari</span>
    </span>
  );
}

export function PremiumCrown() {
  return (
    <span className="premium-crown" title="Premium Cari">
      <span className="premium-crown-mark">
        <CrownIcon size={15} filled />
      </span>
      <span className="premium-crown-text">Premium Cari</span>
    </span>
  );
}
