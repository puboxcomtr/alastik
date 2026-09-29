"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type NavItem = {
  href: string;
  label: string;
  /** Ödeme Yap gibi öne çıkan öğeler sarı metinle gösterilir. */
  vurgu?: boolean;
  /** Varsa öğe açılır menü olur; href yalnızca aktiflik kontrolünde kullanılır. */
  alt?: Array<{ href: string; label: string }>;
};

type Konum = { top: number; left: number };

/** Panel ile buton ve ekran kenarı arasındaki boşluk (px). */
const BOSLUK = 8;
/** CSS'teki min-width (13.5rem); ilk ölçümde panel henüz DOM'da yokken kullanılır. */
const VARSAYILAN_GENISLIK = 216;

/**
 * Panel `position: fixed` olduğu için konumu görüntü alanına göre hesaplanır;
 * böylece üst menünün `overflow-x: auto` kırpma bağlamına takılmaz. Sağ kenarı
 * taşacaksa panel içeri çekilir.
 */
function panelKonumu(dugme: HTMLElement, panelGenisligi: number): Konum {
  const kutu = dugme.getBoundingClientRect();
  const enSag = Math.max(BOSLUK, window.innerWidth - panelGenisligi - BOSLUK);
  return {
    top: kutu.bottom + BOSLUK,
    left: Math.min(Math.max(kutu.left, BOSLUK), enSag),
  };
}

/**
 * Üst menü: soldan başlar, aktif öğe sarı vurgu alır (--brand-primary).
 * "Raporlar" gibi öğeler alt menüyle açılır; site tasarımına ait açılır
 * kutu kullanılır (tarayıcının native menüsü değil).
 */
export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [konum, setKonum] = useState<Konum | null>(null);
  const kokRef = useRef<HTMLElement>(null);
  const dugmeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    setOpen(null); // page değişince menü kapanır
  }, [pathname]);

  // Panel açıkken gerçek genişlikle konumu tazeler; kaydırma/yeniden boyutlandırmada
  // butonun altında kalmaya devam eder.
  useEffect(() => {
    if (!open) return;
    function update(): void {
      const dugme = dugmeRef.current;
      if (!dugme) return;
      setKonum(panelKonumu(dugme, panelRef.current?.offsetWidth ?? VARSAYILAN_GENISLIK));
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    function disariTik(e: MouseEvent): void {
      if (!kokRef.current?.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("mousedown", disariTik);
    return () => document.removeEventListener("mousedown", disariTik);
  }, []);

  return (
    <nav ref={kokRef}>
      {items.map((item) => {
        const active =
          item.href === "/" || item.href === "/admin"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        const sinif = [active ? "active" : "", item.vurgu ? "vurgu" : ""]
          .filter(Boolean)
          .join(" ");

        if (item.alt) {
          const menuAcik = open === item.href;
          return (
            <span className="nav-dropdown" key={item.href}>
              <button
                type="button"
                ref={menuAcik ? dugmeRef : null}
                className={`nav-dropdown-button ${sinif}`.trim()}
                aria-expanded={menuAcik}
                onClick={(e) => {
                  if (menuAcik) {
                    setOpen(null);
                    return;
                  }
                  // İlk konum tıklama anında ölçülür: panel ilk karede doğru
                  // yerde çizilir, efekt yalnızca gerçek genişlikle tazeler.
                  setKonum(panelKonumu(e.currentTarget, VARSAYILAN_GENISLIK));
                  setOpen(item.href);
                }}
              >
                {item.label}
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                  style={{
                    transform: menuAcik ? "rotate(180deg)" : undefined,
                    transition: "transform 0.15s",
                  }}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {menuAcik && konum ? (
                <span
                  className="nav-dropdown-panel"
                  ref={panelRef}
                  style={{ top: konum.top, left: konum.left }}
                >
                  {item.alt.map((a) => (
                    <Link
                      key={a.href}
                      href={a.href}
                      className={pathname === a.href ? "selected" : undefined}
                    >
                      {a.label}
                    </Link>
                  ))}
                </span>
              ) : null}
            </span>
          );
        }

        return (
          <Link key={item.href} href={item.href} className={sinif || undefined}>
            {item.vurgu && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
