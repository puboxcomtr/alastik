import Link from "next/link";
import { BannerCarousel } from "@components/b2b-theme/banner-carousel";
import { WelcomeHeading } from "@components/b2b-theme/welcome-heading";
import { AccountSummaryCards } from "@components/b2b-theme/account-summary-cards";
import { ShowcaseCatalog } from "@components/b2b-theme/showcase-catalog";
import { BANNERS } from "@components/b2b-theme/lib/sample-data";

/**
 * Bayi anasayfası: üstte cari/vade kartları, altında query + filters +
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
