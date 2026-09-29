import Link from "next/link";
import { CalendarIcon } from "@/components/icons";
import { SiparisAdimlari } from "@/components/adimlar";
import { IptalButonu } from "@/components/iptal-butonu";
import { DURUM_ETIKET, formatKurus, formatTarih } from "@/lib/format";
import { SIPARISLER } from "@/lib/ornek-veri";

export default function SiparislerPage() {
  const istatistik = {
    toplam: SIPARISLER.length,
    bekleyen: SIPARISLER.filter((s) => s.durum === "SUBMITTED").length,
    islemde: SIPARISLER.filter((s) =>
      ["CONFIRMED", "PREPARING", "SHIPPED"].includes(s.durum),
    ).length,
    teslim: SIPARISLER.filter((s) => s.durum === "DELIVERED").length,
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Siparişlerim</h1>
          <p className="sub">Sipariş geçmişinizi takip edin</p>
        </div>
        <Link className="btn-primary" href="/lastik">
          Yeni Sipariş
        </Link>
      </div>

      <div className="cards">
        <div className="card">
          <div className="label">Toplam</div>
          <div className="value">{istatistik.toplam}</div>
        </div>
        <div className="card tinted-yellow">
          <div className="label">Bekleyen</div>
          <div className="value">{istatistik.bekleyen}</div>
        </div>
        <div className="card">
          <div className="label">İşlemde</div>
          <div className="value">{istatistik.islemde}</div>
        </div>
        <div className="card tinted-green">
          <div className="label">Teslim</div>
          <div className="value ok">{istatistik.teslim}</div>
        </div>
      </div>

      {SIPARISLER.map((s) => {
        const toplamAdet = s.kalemler.reduce((t, k) => t + k.adet, 0);
        return (
          <div className="order-card" key={s.id}>
            <div className="head">
              <div>
                <span className="no">{s.no}</span>{" "}
                <span
                  className={`badge ${
                    s.durum === "CANCELLED"
                      ? "danger"
                      : s.durum === "DELIVERED"
                        ? "ok"
                        : "info"
                  }`}
                >
                  {DURUM_ETIKET[s.durum]}
                </span>
                {s.erpSiparisNo ? (
                  <span className="badge gray"> ERP: {s.erpSiparisNo}</span>
                ) : null}
                {s.iptalTalepNedeni && s.durum !== "CANCELLED" ? (
                  <span className="badge warn">İptal talebi iletildi</span>
                ) : null}
                <div className="tarih">
                  <CalendarIcon size={13} /> {formatTarih(s.createdAt)}
                </div>
              </div>
            </div>

            <SiparisAdimlari durum={s.durum} />

            <div className="items-box">
              <div className="row">
                <strong>{s.kalemler.length} kalem ürün</strong> · Toplam{" "}
                {toplamAdet} adet
              </div>
              {s.kalemler.slice(0, 3).map((k) => (
                <div className="row" key={k.id}>
                  {k.urunAdi} ×{k.adet}{" "}
                  <span className="badge info">{k.depoAd}</span>
                </div>
              ))}
              {s.kalemler.length > 3 ? (
                <div className="row note">
                  +{s.kalemler.length - 3} kalem daha
                </div>
              ) : null}
            </div>

            <div className="foot">
              <div>
                <div className="tutar">{formatKurus(s.toplamKurus)}</div>
                <div className="odeme">
                  {s.odemeTipi === "vadeli"
                    ? `Vadeli · ${s.vadeGun} gün`
                    : "Peşin"}
                </div>
              </div>
              <div className="actions">
                {s.durum === "SUBMITTED" ? <IptalButonu talep={false} /> : null}
                {["CONFIRMED", "PREPARING", "SHIPPED"].includes(s.durum) &&
                !s.iptalTalepNedeni ? (
                  <IptalButonu talep={true} />
                ) : null}
                <Link className="btn-primary" href={`/siparisler/${s.id}`}>
                  Detay
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
