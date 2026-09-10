import Image from "next/image";
import Link from "next/link";
import { HesapMenu } from "@components/b2b-tema/hesap-menu";
import { NavLinks } from "@components/b2b-tema/nav-links";
import { SepetPaneli } from "@components/b2b-tema/sepet-paneli";
import { SepetSaglayici } from "@components/b2b-tema/sepet-durumu";
import { OturumKapisi } from "@components/b2b-tema/oturum-kapisi";
import { BAYI } from "@components/b2b-tema/lib/ornek-veri";
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
    case "page": return d.pageUrl ? `/sayfa/${d.pageUrl}` : "#";
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
  const yedek: NavItem[] = [
    { href: "/lastik", label: "Lastik" },
    { href: "/jant", label: "Jant" },
  ];
  try {
    const res = await fetch(API_ENDPOINTS.menus.header(), {
      headers: { "X-Site": "b2b" },
      next: { revalidate: 60 },
    });
    const json = await res.json();
    const kayitlar: MenuKaydi[] = json?.success ? json.data : [];
    if (!kayitlar.length) return yedek;
    return kayitlar.map((m) => ({
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
    <OturumKapisi>
    <SepetSaglayici>
      <header className="topnav">
        <div className="topnav-ic">
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
            <HesapMenu email={BAYI.eposta} unvan={BAYI.kisaUnvan} />
            <SepetPaneli />
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
    </SepetSaglayici>
    </OturumKapisi>
  );
}
