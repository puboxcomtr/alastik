import Link from "next/link";
import { BannerCarousel } from "@components/b2b-tema/banner-donen";
import { WelcomeHeading } from "@components/b2b-tema/hosgeldin-basligi";
import { AccountSummaryCards } from "@components/b2b-tema/cari-ozet-kartlari";
import { ShowcaseCatalog } from "@components/b2b-tema/vitrin-katalog";
import { BANNERS } from "@components/b2b-tema/lib/ornek-veri";

/**
 * Bayi anasayfası: üstte cari/vade kartları, altında arama + filtreler +
 * ürün tablosu.
 */
export default function DealerHome() {

  return (
    <>
      <div className="page-head">
        <WelcomeHeading />
        <Link className="btn-ghost" href="/cari">
          Cari Hesap Özeti
        </Link>
      </div>

      <BannerCarousel banners={BANNERS} />

      <AccountSummaryCards />

      <ShowcaseCatalog />
    </>
  );
}
