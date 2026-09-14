import Link from "next/link";
import { formatKurus, formatDate, formatDay } from "@components/b2b-theme/lib/format";
import {
  ACCOUNT_SUMMARY,
  REMAINING_LIMIT_KURUS,
  TOTAL_RISK_KURUS,
} from "@components/b2b-theme/lib/sample-data";
import {
  AlertIcon,
  CalendarIcon,
  CardIcon,
  CartIcon,
  OrdersIcon,
} from "@components/b2b-theme/icons";

/**
 * Cari Hesap Özeti: bakiye, borç/alacak kırılımı, kredi limiti kullanımı ve
 * açık faturalar.
 */
export default function CariPage() {
  const ozet = ACCOUNT_SUMMARY;
  const borclu = ozet.balanceKurus > 0;
  const limitUsagePct =
    ozet.creditLimitKurus > 0
      ? Math.min(100, Math.round((TOTAL_RISK_KURUS * 100) / ozet.creditLimitKurus))
      : 0;
  const gecikmisler = ozet.invoices.filter(
    (f) => f.gecikmeGun !== null && f.gecikmeGun > 0,
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Cari Hesap Özeti</h1>
          <p className="sub">
            {ozet.unvan} · Cari: {ozet.accountCode} · Güncelleme:{" "}
            {formatDate(ozet.sonSenkronAt)}
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
          <strong>{formatKurus(ozet.overdueKurus)}</strong>. Sipariş
          süreçlerinizin aksamaması için ödenmesi gerekir.
        </div>
      ) : null}

      {/* ── Bakiye + limit ── */}
      <div className="account-top">
        <section className={`account-balance${borclu ? " borclu" : ""}`}>
          <div className="label">
            Güncel Bakiye
            <span className="yon">
              {ozet.borcAlacakYonu === "B" ? "BORÇLU" : "ALACAKLI"}
            </span>
          </div>
          <div className="tutar">{formatKurus(Math.abs(ozet.balanceKurus))}</div>
          <div className="kirilim">
            <span className="borc">
              Borç <strong>{formatKurus(ozet.borcToplamKurus)}</strong>
            </span>
            <span className="alacak">
              Alacak <strong>{formatKurus(ozet.alacakToplamKurus)}</strong>
            </span>
          </div>
          <div className="dip">
            Ödeme planı: {ozet.paymentPlan} · Son ödemeniz:{" "}
            {formatDay(ozet.sonOdemeTarihi)}
          </div>
        </section>

        <section className="account-limit">
          <div className="label">Kredi Limiti</div>
          <div className="tutar">{formatKurus(ozet.creditLimitKurus)}</div>
          <div className="cubuk" aria-hidden="true">
            <span style={{ width: `${limitUsagePct}%` }} />
          </div>
          <div className="limit-breakdown">
            <div>
              <span className="k-label">Kullanılan</span>
              <strong>{formatKurus(TOTAL_RISK_KURUS)}</strong>
            </div>
            <div className="sag">
              <span className="k-label">Kullanılabilir</span>
              <strong className={REMAINING_LIMIT_KURUS < 0 ? "danger" : "ok"}>
                {formatKurus(REMAINING_LIMIT_KURUS)}
              </strong>
            </div>
          </div>
          {ozet.pendingOrderKurus > 0 ? (
            <div className="dip">
              Kullanılan tutara henüz faturalanmamış{" "}
              {formatKurus(ozet.pendingOrderKurus)} sipariş dahildir.
            </div>
          ) : null}
        </section>
      </div>

      {/* ── Hızlı erişim ── */}
      <div className="account-shortcut">
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
        <div className={`card${ozet.overdueKurus > 0 ? " tinted-red" : ""}`}>
          <div className="label">Geçmiş Vadeler</div>
          <div className={`value${ozet.overdueKurus > 0 ? " danger" : ""}`}>
            {formatKurus(ozet.overdueKurus)}
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
          <div className="value">{formatKurus(ozet.totalTermKurus)}</div>
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
            {ozet.invoices.map((f) => {
              const gecikti = f.gecikmeGun !== null && f.gecikmeGun > 0;
              return (
                <tr key={f.fisNo}>
                  <td className="sku">{f.fisNo}</td>
                  <td>{formatDay(f.tarih)}</td>
                  <td>{formatDay(f.vadeTarihi)}</td>
                  <td className="note">{f.paymentPlan ?? "—"}</td>
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
        {formatDay(ozet.sonOdemeTarihi)}. Ayrıntı için temsilcinizle
        görüşebilirsiniz.
      </p>
    </>
  );
}
