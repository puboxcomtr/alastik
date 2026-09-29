import Link from "next/link";
import { ArrowRightIcon, CardIcon, FileIcon, OrdersIcon, WalletIcon } from "./icons";
import type { JSX } from "react";

/** Anasayfa hızlı erişim blokları — grafiğin altında, markanın renkleriyle. */
type QuickAction = {
  href: string;
  label: string;
  icon: JSX.Element;
};

const ACTIONS: QuickAction[] = [
  { href: "/siparisler", label: "Siparişlerim", icon: <OrdersIcon size={20} /> },
  { href: "/odeme", label: "Ödeme Yap", icon: <CardIcon size={20} /> },
  { href: "/raporlar/odemeler", label: "Ödemelerim", icon: <WalletIcon size={20} /> },
  { href: "/raporlar/cari-hareketler", label: "Cari Ekstre", icon: <FileIcon size={20} /> },
];

export function QuickActions() {
  return (
    <section className="quick-actions">
      <h2 className="quick-heading">Hızlı İşlemler</h2>
      <div className="quick-grid">
        {ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className="quick-tile">
            <span className="quick-icon">{a.icon}</span>
            <span className="quick-label">{a.label}</span>
            <ArrowRightIcon size={16} className="quick-chevron" />
          </Link>
        ))}
      </div>
    </section>
  );
}
