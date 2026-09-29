import Image from "next/image";
import Link from "next/link";
import { HesapMenu } from "@/components/hesap-menu";
import { NavLinks } from "@/components/nav-links";
import { SepetPaneli } from "@/components/sepet-paneli";
import { SepetSaglayici } from "@/components/sepet-durumu";
import { BAYI } from "@/lib/ornek-veri";

/**
 * Bayi paneli çerçevesi: üst menü + sepet + hesap menüsü.
 *
 * ŞABLON NOTU: oturum kontrolü YOKTUR. Gerçek uygulamada bu düzenin içine
 * kendi kimlik doğrulamanızı koyup, oturumu olmayan isteği giriş ekranına
 * yönlendirmelisiniz.
 */
export default function DealerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SepetSaglayici>
      <header className="topnav">
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
            { href: "/lastik", label: "Lastik" },
            { href: "/jant", label: "Jant" },
            { href: "/siparisler", label: "Siparişler" },
            {
              href: "/raporlar",
              label: "Raporlar",
              alt: [
                { href: "/raporlar/cari-hareketler", label: "Cari Hareketler" },
                { href: "/raporlar/vade-takvimi", label: "Vade Takvimi" },
                { href: "/raporlar/siparis-raporu", label: "Sipariş Raporu" },
                { href: "/raporlar/alim-adet", label: "Bayi Alım Adet Raporu" },
                { href: "/raporlar/odemeler", label: "Kasa Tahsilatları" },
                { href: "/raporlar/taksit-secenekleri", label: "Taksit Seçenekleri" },
              ],
            },
            { href: "/odeme", label: "Ödeme Yap", vurgu: true },
          ]}
        />
        <div className="right">
          <HesapMenu email={BAYI.eposta} unvan={BAYI.kisaUnvan} />
          <SepetPaneli />
        </div>
      </header>
      <main className="page">{children}</main>
    </SepetSaglayici>
  );
}
