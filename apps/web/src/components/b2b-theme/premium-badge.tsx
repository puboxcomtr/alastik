import { CrownIcon } from "./icons";

/**
 * Premium cari rozeti (siyah zemin, marka sarısı yazı). Premium bilgisi DIA cari kartından gelir (/me → premium).
 * Hesap menüsü, Cari Özet ve plasiyerin bayi seçim listesinde kullanılır.
 */
export function PremiumBadge() {
  return (
    <span className="premium-badge" title="Premium Cari">
      <CrownIcon size={13} />
      <span className="premium-badge-text">Premium Cari</span>
    </span>
  );
}

/**
 * Karşılama başlığındaki Premium işareti: cari adının yanında taç amblemi + ince "Premium Cari" yazısı.
 */
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
