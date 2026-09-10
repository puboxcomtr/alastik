import Link from "next/link";
import { formatKurus, formatTarih, gunFormat } from "@components/b2b-tema/lib/format";
import {
  CARI_OZET,
  KALAN_LIMIT_KURUS,
  TOPLAM_RISK_KURUS,
} from "@components/b2b-tema/lib/ornek-veri";
import {
  AlertIcon,
  CalendarIcon,
  CardIcon,
  CartIcon,
  OrdersIcon,
} from "@components/b2b-tema/icons";

/**
 * Cari Hesap Özeti: bakiye, borç/alacak kırılımı, kredi limiti kullanımı ve
 * açık faturalar.
 */
export default function CariPage() {
  const ozet = CARI_OZET;
  const borclu = ozet.bakiyeKurus > 0;
  const limitKullanimYuzde =
    ozet.krediLimitiKurus > 0
      ? Math.min(100, Math.round((TOPLAM_RISK_KURUS * 100) / ozet.krediLimitiKurus))
      : 0;
  const gecikmisler = ozet.faturalar.filter(
    (f) => f.gecikmeGun !== null && f.gecikmeGun > 0,
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Cari Hesap Özeti</h1>
          <p className="sub">
            {ozet.unvan} · Cari: {ozet.cariKodu} · Güncelleme:{" "}
            {formatTarih(ozet.sonSenkronAt)}
          </p>
        </div>
        <div className="head-actions">
          <Link className="btn-primary" href="/odeme">
            <CardIcon size={16} /> Ödeme Yap
          </Link>
        </div>
      </div>

      {gecikmisler.length > 0 ? (
        <div className="alert warn">
          <AlertIcon size={17} /> Vadesi {gecikmisler[0]?.gecikmeGun} gün geçen{" "}
          {gecikmisler.length} faturanız var — toplam{" "}
          <strong>{formatKurus(ozet.vadesiGecenKurus)}</strong>. Sipariş
          süreçlerinizin aksamaması için ödenmesi gerekir.
        </div>
      ) : null}

      {/* ── Bakiye + limit ── */}
      <div className="cari-ust">
        <section className={`cari-bakiye${borclu ? " borclu" : ""}`}>
          <div className="etiket">
            Güncel Bakiye
            <span className="yon">
              {ozet.borcAlacakYonu === "B" ? "BORÇLU" : "ALACAKLI"}
            </span>
          </div>
          <div className="tutar">{formatKurus(Math.abs(ozet.bakiyeKurus))}</div>
          <div className="kirilim">
            <span className="borc">
              Borç <strong>{formatKurus(ozet.borcToplamKurus)}</strong>
            </span>
            <span className="alacak">
              Alacak <strong>{formatKurus(ozet.alacakToplamKurus)}</strong>
            </span>
          </div>
          <div className="dip">
            Ödeme planı: {ozet.odemePlani} · Son ödemeniz:{" "}
            {gunFormat(ozet.sonOdemeTarihi)}
          </div>
        </section>

        <section className="cari-limit">
          <div className="etiket">Kredi Limiti</div>
          <div className="tutar">{formatKurus(ozet.krediLimitiKurus)}</div>
          <div className="cubuk" aria-hidden="true">
            <span style={{ width: `${limitKullanimYuzde}%` }} />
          </div>
          <div className="limit-kirilim">
            <div>
              <span className="k-etiket">Kullanılan</span>
              <strong>{formatKurus(TOPLAM_RISK_KURUS)}</strong>
            </div>
            <div className="sag">
              <span className="k-etiket">Kullanılabilir</span>
              <strong className={KALAN_LIMIT_KURUS < 0 ? "danger" : "ok"}>
                {formatKurus(KALAN_LIMIT_KURUS)}
              </strong>
            </div>
          </div>
          {ozet.bekleyenSiparisKurus > 0 ? (
            <div className="dip">
              Kullanılan tutara henüz faturalanmamış{" "}
              {formatKurus(ozet.bekleyenSiparisKurus)} sipariş dahildir.
            </div>
          ) : null}
        </section>
      </div>

      {/* ── Hızlı erişim ── */}
      <div className="cari-kisayol">
        <Link href="/lastik" className="kisayol">
          <CartIcon size={18} />
          <div>
            <strong>Sipariş Ver</strong>
            <span>Lastik ve jant katalogu</span>
          </div>
        </Link>
        <Link href="/siparisler" className="kisayol">
          <OrdersIcon size={18} />
          <div>
            <strong>Siparişlerim</strong>
            <span>Durum ve geçmiş</span>
          </div>
        </Link>
        <Link href="/odeme" className="kisayol">
          <CardIcon size={18} />
          <div>
            <strong>Ödeme Yap</strong>
            <span>Havale/EFT bilgileri</span>
          </div>
        </Link>
        <Link href="/hesap/ayarlar" className="kisayol">
          <CalendarIcon size={18} />
          <div>
            <strong>Hesap Ayarları</strong>
            <span>Parola ve bilgiler</span>
          </div>
        </Link>
      </div>

      {/* ── Vade kovaları ── */}
      <div className="cards">
        <div className={`card${ozet.vadesiGecenKurus > 0 ? " tinted-red" : ""}`}>
          <div className="label">Geçmiş Vadeler</div>
          <div className={`value${ozet.vadesiGecenKurus > 0 ? " danger" : ""}`}>
            {formatKurus(ozet.vadesiGecenKurus)}
          </div>
          <div className="note">
            Ortalama gecikme {ozet.ortalamaGecikmeGun} gün
          </div>
        </div>
        <div className="card tinted-yellow">
          <div className="label">Bu Ay Vadesi</div>
          <div className="value">{formatKurus(ozet.buAyVadesiKurus)}</div>
        </div>
        <div className="card">
          <div className="label">Gelecek 30 Gün</div>
          <div className="value">{formatKurus(ozet.gelecek30GunKurus)}</div>
        </div>
        <div className="card">
          <div className="label">Toplam Vadeli</div>
          <div className="value">{formatKurus(ozet.toplamVadeliKurus)}</div>
        </div>
      </div>

      {/* ── Açık faturalar ── */}
      <h2 className="section">Açık Faturalar ve Vadeler</h2>
      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr>
              <th>Fatura No</th>
              <th>Tarih</th>
              <th>Vade</th>
              <th>Ödeme Planı</th>
              <th className="num">Fatura Tutarı</th>
              <th className="num">Kalan</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {ozet.faturalar.map((f) => {
              const gecikti = f.gecikmeGun !== null && f.gecikmeGun > 0;
              return (
                <tr key={f.fisNo}>
                  <td className="sku">{f.fisNo}</td>
                  <td>{gunFormat(f.tarih)}</td>
                  <td>{gunFormat(f.vadeTarihi)}</td>
                  <td className="note">{f.odemePlani ?? "—"}</td>
                  <td className="num">{formatKurus(f.netKurus)}</td>
                  <td className="num">
                    <strong>{formatKurus(f.kalanKurus)}</strong>
                  </td>
                  <td>
                    {f.gecikmeGun === null ? (
                      <span className="badge gray">Vade yok</span>
                    ) : gecikti ? (
                      <span className="badge danger">
                        {f.gecikmeGun} gün gecikmiş
                      </span>
                    ) : (
                      <span className="badge ok">
                        {Math.abs(f.gecikmeGun)} gün kaldı
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="note" style={{ marginTop: "1rem" }}>
        Toplam tahsilatınız {formatKurus(ozet.alacakToplamKurus)}, son ödeme{" "}
        {gunFormat(ozet.sonOdemeTarihi)}. Ayrıntı için temsilcinizle
        görüşebilirsiniz.
      </p>
    </>
  );
}
