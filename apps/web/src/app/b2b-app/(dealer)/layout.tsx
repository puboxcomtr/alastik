import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "@components/b2b-theme/account-menu";
import { NavLinks } from "@components/b2b-theme/nav-links";
import { CartPanel } from "@components/b2b-theme/cart-panel";
import { CartProvider } from "@components/b2b-theme/cart-status";
import { SessionGate } from "@components/b2b-theme/session-gate";
import { API_ENDPOINTS } from "@src/config/api";

type MenuKaydi = {
  name: string;
  menuType: string;
  linkData?: {
    url?: string;
    categoryUrl?: string;
    pageUrl?: string;
    brandUrl?: string;
    productUrl?: string;
  };
  children?: MenuKaydi[];
};

type NavItem = { href: string; label: string; vurgu?: boolean; alt?: { href: string; label: string }[] };

/** Menü kaydını tema nav bağlantısına çevirir (tür → adres) */
function menuHref(menu: MenuKaydi): string {
  const d = menu.linkData || {};
  switch (menu.menuType) {
    case "category": return d.categoryUrl ? `/kategori/${d.categoryUrl}` : "#";
    case "page": return d.pageUrl ? `/page/${d.pageUrl}` : "#";
    case "brand": return d.brandUrl ? `/marka/${d.brandUrl}` : "#";
    case "product": return d.productUrl ? `/urun/${d.productUrl}` : "#";
    default: return d.url || "#";
  }
}

/**
 * Üst menü PANELDEN yönetilir (Menü Yönetimi, site: B2B, alan: header).
 * API'ye erişilemez ya da menü boşsa varsayılan Lastik/Jant yedeği kullanılır.
 */
async function ustMenuyuGetir(): Promise<NavItem[]> {
  // Menü DB'den (kategoriler) gelir; API boş/erişilemezse boş menü ile devam.
  const yedek: NavItem[] = [];
  try {
    const res = await fetch(API_ENDPOINTS.menus.header(), {
      headers: { "X-Site": "b2b" },
      next: { revalidate: 60 },
    });
    const json = await res.json();
    const records: MenuKaydi[] = json?.success ? json.data : [];
    if (!records.length) return yedek;
    return records.map((m) => ({
      href: menuHref(m),
      label: m.name,
      ...(m.children?.length
        ? { alt: m.children.map((c) => ({ href: menuHref(c), label: c.name })) }
        : {}),
    }));
  } catch {
    return yedek;
  }
}

/** Bayi paneli çerçevesi: üst menü (DB) + sepet + hesap menüsü + oturum kapısı. */
export default async function DealerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ustMenu = await ustMenuyuGetir();

  return (
    <SessionGate>
    <CartProvider>
      <header className="topnav">
        <div className="topnav-inner">
          <Link className="brand" href="/">
            <Image
              src="/lastikjant-logo.png"
              alt="LastikJantAVM"
              width={170}
              height={34}
              priority
            />
          </Link>
          <NavLinks
            items={[
              ...ustMenu,
              { href: "/odeme", label: "Ödeme Yap", vurgu: true },
            ]}
          />
          <div className="right">
            <AccountMenu />
            <CartPanel />
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
    </CartProvider>
    </SessionGate>
  );
}
