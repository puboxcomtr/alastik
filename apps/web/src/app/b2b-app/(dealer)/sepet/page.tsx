"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeftIcon, SeasonIcon, TrashIcon } from "@components/b2b-theme/icons";
import { useCart } from "@components/b2b-theme/cart-status";
import { showToast } from "@components/b2b-theme/toast";
import { formatKurus } from "@components/b2b-theme/lib/format";
import { AnimatedMoney } from "@components/b2b-theme/animated-money";
import { DeliveryAddress } from "@components/b2b-theme/delivery-address";
import { REMAINING_LIMIT_KURUS } from "@components/b2b-theme/lib/sample-data";
import { API_ENDPOINTS } from "@src/config/api";
import {
  B2bPricing,
  computeDiscountedTotals,
  lineDiscountPct,
} from "@components/b2b-theme/lib/payment-pricing";

// Teslimat yöntemleri (sepette gösterim sırası). id = sipariş/işlem anahtarı.
// "Şubeden Gel Al" (gelAl) DIA Gel-Al kampanyasının ek iskontosunu getirir.
const DELIVERY_METHODS = [
  { id: "standartSevkiyat", title: "Standart Sevkiyat" },
  { id: "gelAl", title: "Şubeden Gel Al" },
  { id: "kargo", title: "Kargo ile Sevkiyat" },
];

type BankAccount = {
  _id: string;
  name?: string;
  accountName?: string;
  iban?: string;
  processingTime?: string;
};

export default function SepetPage() {
  const sepet = useCart();
  const router = useRouter();
  const [pricing, setPricing] = useState<B2bPricing | null>(null);
  const [paymentId, setPaymentId] = useState("");
  const [deliveryId, setDeliveryId] = useState(DELIVERY_METHODS[0].id);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Siparişi oluştur → sunucuda WebOrder + DIA aktarımı
  async function siparisVer() {
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    if (!token) {
      showToast("Oturum bulunamadı, tekrar giriş yapın.", "hata");
      return;
    }
    if (sepet.lines.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const items = sepet.lines.map(s => ({ stockCode: s.urun.stockCode, quantity: s.adet }));
      const res = await fetch(API_ENDPOINTS.b2b.siparis(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Site": "b2b"
        },
        body: JSON.stringify({ items, paymentMethod: paymentId, deliveryMethod: deliveryId })
      }).then(r => r.json());
      if (res?.success && res.data) {
        showToast("Siparişiniz oluşturuldu.", "ok");
        sepet.clear();
        router.push("/siparisler");
      } else {
        showToast(res?.message || "Sipariş oluşturulamadı.", "hata");
      }
    } catch {
      showToast("Sipariş oluşturulamadı.", "hata");
    } finally {
      setSubmitting(false);
    }
  }

  // Banka hesapları (havale ile ödeme seçilince gösterilir) — site bazlı (b2b)
  useEffect(() => {
    fetch(API_ENDPOINTS.payment.bankAccounts(), { headers: { "X-Site": "b2b" } })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) setBankAccounts(res.data);
      })
      .catch(() => {});
  }, []);

  // Ödeme yöntemleri + marka bazlı iskonto haritası (carinin segmentine göre)
  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    if (!t) return;
    fetch(API_ENDPOINTS.b2b.odemeYontemleri(), {
      headers: { Authorization: `Bearer ${t}`, "X-Site": "b2b" },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && res.data) {
          setPricing(res.data);
          setPaymentId((prev) => prev || res.data.methods?.[0]?.id || "");
        }
      })
      .catch(() => {});
  }, []);

  const gelAlSecili = deliveryId === "gelAl";
  const gelAlBonus = gelAlSecili ? pricing?.gelAlBonus ?? 0 : 0;
  const totals = computeDiscountedTotals(sepet.lines, pricing, paymentId, gelAlSecili);
  const limitExceeded = totals.totalKurus > REMAINING_LIMIT_KURUS;

  return (
    <>
      <div className="page-head" style={{ justifyContent: "flex-end" }}>
        <Link className="btn-ghost" href="/">
          <ArrowLeftIcon size={15} /> Alışverişe devam
        </Link>
      </div>


      {sepet.lines.length === 0 ? (
        <div className="card">
          <p className="note">
            Sepetiniz boş. <Link href="/">Lastik aramaya başlayın</Link>.
          </p>
        </div>
      ) : (
        <div className="cart-layout">
          {/* SOL: teslimat adresi + ödeme yöntemi */}
          <div className="cart-left">
            {/* Şubeden Gel Al'da teslimat adresi sorulmaz (üründen şubede teslim) */}
            {!gelAlSecili ? <DeliveryAddress /> : null}

            <div className="cart-card payment-method-card">
              <h2 className="cart-card-title">Ödeme Yöntemi</h2>
              {pricing && pricing.methods.length > 0 ? (
                <div className="payment-grid">
                  {pricing.methods.map((m) => {
                    const secili = m.id === paymentId;
                    return (
                      <label
                        key={m.id}
                        className={`payment-option${secili ? " secili" : ""}`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={secili}
                          onChange={() => setPaymentId(m.id)}
                        />
                        <span className="po-radio" aria-hidden="true" />
                        <span className="po-title">{m.title}</span>
                        {m.discountPct > 0 ? (
                          <span className="po-discount">%{m.discountPct} İskonto</span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="note" style={{ padding: "0.6rem 0" }}>
                  {pricing ? "Bu cari için tanımlı ödeme yöntemi bulunamadı." : "Ödeme yöntemleri yükleniyor…"}
                </p>
              )}
            </div>

            {paymentId === "havale" ? (
              <div className="cart-card bank-accounts-card">
                <h2 className="cart-card-title">Banka Hesap Bilgilerimiz</h2>
                {bankAccounts.length > 0 ? (
                  <div className="bank-list">
                    {bankAccounts.map((b) => (
                      <div className="bank-item" key={b._id}>
                        <div className="bank-item-head">
                          <strong className="bank-name">{b.name}</strong>
                          {b.accountName ? (
                            <span className="bank-holder">{b.accountName}</span>
                          ) : null}
                        </div>
                        {b.iban ? (
                          <div className="bank-iban-row">
                            <code className="bank-iban">{b.iban}</code>
                            <button
                              type="button"
                              className="bank-copy"
                              onClick={() => {
                                navigator.clipboard
                                  ?.writeText(b.iban || "")
                                  .then(() => showToast("IBAN kopyalandı", "ok"))
                                  .catch(() => {});
                              }}
                            >
                              Kopyala
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="note" style={{ padding: "0.6rem 0" }}>
                    Tanımlı banka hesabı bulunamadı.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {/* SAĞ: ürünler + sipariş özeti */}
          <aside className="cart-right">
            <div className="cart-card">
              <h2 className="cart-card-title">Sepetiniz</h2>
              {sepet.lines.map((s) => {
                const payPct = s.urun.xml ? 0 : lineDiscountPct(pricing, s.urun.marka, paymentId);
                const gaPct = s.urun.xml ? 0 : gelAlBonus;
                const satirKurus = Math.round(s.kdvDahilBirimKurus * s.adet * (1 - payPct / 100) * (1 - gaPct / 100));
                return (
                  <div className="cart-line" key={`${s.productId}:${s.warehouseId}`}>
                    {s.urun.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="cli-image" src={s.urun.imageUrl} alt={s.urun.marka} loading="lazy" />
                    ) : (
                      <span className="cli-image bos" aria-hidden="true" />
                    )}

                    <div className="cli-main">
                      <div className="product-name" title={`${s.urun.size} ${s.urun.pattern}`}>
                        {s.urun.size} {s.urun.pattern}
                      </div>

                      <div className="cli-brand-row">
                        {s.urun.brandLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="brand-logo" src={s.urun.brandLogoUrl} alt={s.urun.marka} title={s.urun.marka} />
                        ) : (
                          <strong className="cli-brand-name">{s.urun.marka}</strong>
                        )}
                        {s.urun.dotYear ? <span className="cli-year">{s.urun.dotYear}</span> : null}
                        <SeasonIcon mevsim={s.urun.mevsim} size={16} />
                        <span className="cli-sku">{s.urun.stockCode}</span>
                      </div>
                    </div>

                    <div className="cli-right">
                      <span className="stepper acikta cli-stepper">
                        {s.adet === 1 ? (
                          <button
                            type="button"
                            className="stepper-remove"
                            aria-label="Kaldır"
                            title="Kaldır"
                            onClick={() => {
                              sepet.removeItem(s.productId, s.warehouseId);
                              showToast("Sepetten çıkarıldı", "bilgi");
                            }}
                          >
                            <TrashIcon size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label="Azalt"
                            onClick={() => {
                              sepet.setQty(s.productId, s.warehouseId, s.adet - 1);
                              showToast("Adet güncellendi", "bilgi");
                            }}
                          >
                            −
                          </button>
                        )}
                        <input readOnly value={s.adet} aria-label="Adet" tabIndex={-1} />
                        <button
                          type="button"
                          aria-label="Artır"
                          onClick={() => {
                            sepet.setQty(s.productId, s.warehouseId, s.adet + 1);
                            showToast("Adet güncellendi", "ok");
                          }}
                        >
                          +
                        </button>
                      </span>
                      <div className="cli-total"><AnimatedMoney kurus={satirKurus} /></div>
                    </div>
                  </div>
                );
              })}

              {/* Sepetiniz kartının altında teslimat yöntemi + özet */}
              <div className="cart-summary">
                <div className="summary-teslimat">
                  <label htmlFor="teslimatSelect">Teslimat Yöntemi</label>
                  <select
                    id="teslimatSelect"
                    className="teslimat-select"
                    value={deliveryId}
                    onChange={(e) => setDeliveryId(e.target.value)}
                  >
                    {DELIVERY_METHODS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                        {d.id === "gelAl" && (pricing?.gelAlBonus ?? 0) > 0
                          ? ` (+%${pricing?.gelAlBonus} iskonto)`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="summary-row">
                  <span>Ara Toplam</span>
                  <span><AnimatedMoney kurus={totals.matrahToplamKurus} /></span>
                </div>
                <div className="summary-row">
                  <span>KDV</span>
                  <span><AnimatedMoney kurus={totals.kdvToplamKurus} /></span>
                </div>
                {totals.indirimToplamKurus > 0 ? (
                  <div className="summary-row indirim">
                    <span>İskonto</span>
                    <span>− <AnimatedMoney kurus={totals.indirimToplamKurus} /></span>
                  </div>
                ) : null}
                <div className="summary-row grand">
                  <span>Toplam</span>
                  <span><AnimatedMoney kurus={totals.totalKurus} /></span>
                </div>

                {limitExceeded ? (
                  <div className="alert warn summary-warning">
                    Sepet toplamı kalan kredi limitinizi (
                    {formatKurus(Math.max(0, REMAINING_LIMIT_KURUS))}) aşıyor.
                  </div>
                ) : null}

                <button
                  className="primary summary-order"
                  onClick={siparisVer}
                  disabled={submitting || sepet.lines.length === 0}
                >
                  {submitting ? "Sipariş oluşturuluyor…" : "Sipariş Ver"}
                </button>

                <button
                  className="summary-clear"
                  type="button"
                  onClick={() => {
                    sepet.clear();
                    showToast("Sepetiniz temizlendi", "bilgi");
                  }}
                >
                  Sepeti Temizle
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
