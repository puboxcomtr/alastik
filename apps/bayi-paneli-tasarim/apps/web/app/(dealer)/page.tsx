import { BannerDonen } from "@/components/banner-donen";
import { Katalog } from "@/components/katalog";
import { formatKurus, formatTarih } from "@/lib/format";
import {
  BANNERLAR,
  BAYI,
  BEKLEYEN_SIPARIS_KURUS,
  CARI_OZET,
  KALAN_LIMIT_KURUS,
} from "@/lib/ornek-veri";

/**
 * Bayi anasayfası: üstte cari/vade kartları, altında arama + filtreler +
 * ürün tablosu.
 */
export default function DealerHome() {
  const bakiye = CARI_OZET.bakiyeKurus;
  const vadesiGecen = CARI_OZET.vadesiGecenKurus;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{BAYI.unvan}</h1>
          <p className="sub">
            Cari bakiyeniz ve limitiniz özet olarak aşağıdadır.
          </p>
        </div>
      </div>

      <BannerDonen bannerlar={BANNERLAR} />

      <div className="cards">
        <div className={`card${bakiye > 0 ? " tinted-red" : ""}`}>
          <div className="label">Bakiye</div>
          <div className={`value${bakiye > 0 ? " danger" : ""}`}>
            {formatKurus(bakiye)}
          </div>
          {bakiye > 0 ? <div className="note">Borcunuz var</div> : null}
        </div>
        <div className="card">
          <div className="label">Toplam Limit</div>
          <div className="value">{formatKurus(BAYI.krediLimitiKurus)}</div>
        </div>
        <div
          className={`card${KALAN_LIMIT_KURUS >= 0 ? " tinted-green" : " tinted-red"}`}
        >
          <div className="label">Kalan Limit</div>
          <div className={`value${KALAN_LIMIT_KURUS < 0 ? " danger" : " ok"}`}>
            {formatKurus(KALAN_LIMIT_KURUS)}
          </div>
          {BEKLEYEN_SIPARIS_KURUS > 0 ? (
            <div className="note">
              {formatKurus(BEKLEYEN_SIPARIS_KURUS)} bekleyen sipariş dahil
            </div>
          ) : null}
        </div>
        <div className={`card${vadesiGecen > 0 ? " tinted-red" : ""}`}>
          <div className="label">Vadesi Geçen Borç</div>
          <div className={`value${vadesiGecen > 0 ? " danger" : ""}`}>
            {formatKurus(vadesiGecen)}
          </div>
          {vadesiGecen > 0 ? (
            <div className="note" style={{ color: "var(--danger)" }}>
              Gecikmiş ödemeniz var
            </div>
          ) : null}
        </div>
      </div>

      <Katalog />

      <p className="note" style={{ marginTop: "1rem" }}>
        Son güncelleme: {formatTarih(BAYI.sonSenkronAt)} · Ödeme vadesi:{" "}
        {BAYI.odemeVadeGun} gün
      </p>
    </>
  );
}
