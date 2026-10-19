"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type NavItem = {
  href: string;
  label: string;
  vurgu?: boolean;
  alt?: Array<{ href: string; label: string }>;
};

type Konum = { top: number; left: number };

const BOSLUK = 8;
const VARSAYILAN_GENISLIK = 216;

function panelKonumu(dugme: HTMLElement, panelGenisligi: number): Konum {
  const kutu = dugme.getBoundingClientRect();
  const enSag = Math.max(BOSLUK, window.innerWidth - panelGenisligi - BOSLUK);
  return {
    top: kutu.bottom + BOSLUK,
    left: Math.min(Math.max(kutu.left, BOSLUK), enSag),
  };
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const [konum, setKonum] = useState<Konum | null>(null);
  const kokRef = useRef<HTMLElement>(null);
  const dugmeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    setOpen(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onEsc);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === "/" || href === "/admin" ? pathname === href : pathname.startsWith(href);

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
    <>
    <nav ref={kokRef}>
      {items.map((item) => {
        const active = isActive(item.href);
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
            {item.vurgu && <CardGlyph />}
            {item.label}
          </Link>
        );
      })}
    </nav>

    <button
      type="button"
      className="nav-burger"
      aria-label="Menüyü aç"
      aria-expanded={mobileOpen}
      onClick={() => setMobileOpen(true)}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
    {mobileOpen ? (
      <div className="mobile-menu-overlay" onClick={() => setMobileOpen(false)}>
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menü" onClick={(e) => e.stopPropagation()}>
          <div className="mobile-menu-head">
            <span>Menü</span>
            <button type="button" className="mobile-menu-close" aria-label="Menüyü kapat" onClick={() => setMobileOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="mobile-menu-list">
            {items.map((item) => {
              const active = isActive(item.href);
              if (item.alt) {
                const groupOpen = mobileGroup === item.href || item.alt.some((a) => pathname === a.href);
                return (
                  <div className="mobile-menu-group" key={item.href}>
                    <button
                      type="button"
                      className={`mobile-menu-item${active ? " active" : ""}`}
                      aria-expanded={groupOpen}
                      onClick={() => setMobileGroup(groupOpen ? null : item.href)}
                    >
                      {item.label}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
                        style={{ transform: groupOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}>
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    {groupOpen ? (
                      <div className="mobile-menu-sub">
                        {item.alt.map((a) => (
                          <Link key={a.href} href={a.href} className={pathname === a.href ? "selected" : undefined}>
                            {a.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mobile-menu-item${active ? " active" : ""}${item.vurgu ? " vurgu" : ""}`}
                >
                  {item.vurgu && <CardGlyph />}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}

function CardGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}
