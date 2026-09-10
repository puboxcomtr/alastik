import Link from "next/link";
import { BannerDonen } from "@components/b2b-tema/banner-donen";
import { HosgeldinBasligi } from "@components/b2b-tema/hosgeldin-basligi";
import { CariOzetKartlari } from "@components/b2b-tema/cari-ozet-kartlari";
import { VitrinKatalog } from "@components/b2b-tema/vitrin-katalog";
import { BANNERLAR } from "@components/b2b-tema/lib/ornek-veri";

/**
 * Bayi anasayfası: üstte cari/vade kartları, altında arama + filtreler +
 * ürün tablosu.
 */
export default function DealerHome() {

  return (
    <>
      <div className="page-head">
        <HosgeldinBasligi />
        <Link className="btn-ghost" href="/cari">
          Cari Hesap Özeti
        </Link>
      </div>

      <BannerDonen bannerlar={BANNERLAR} />

      <CariOzetKartlari />

      <VitrinKatalog />
    </>
  );
}
