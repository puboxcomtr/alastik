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

export default function SepetPage() {
  const sepet = useCart();
  const router = useRouter();
  const [pricing, setPricing] = useState<B2bPricing | null>(null);
  const [paymentId, setPaymentId] = useState("");
  const [submitted, setSubmitted] = useState(false);

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

  const totals = computeDiscountedTotals(sepet.lines, pricing, paymentId);
  const limitExceeded = totals.totalKurus > REMAINING_LIMIT_KURUS;

  return (
    <>
      <div className="page-head" style={{ justifyContent: "flex-end" }}>
        <Link className="btn-ghost" href="/lastik">
          <ArrowLeftIcon size={15} /> Alışverişe devam
        </Link>
      </div>

      {submitted ? (
        <div className="alert warn">
          Bu bir tasarım şablonudur — sipariş oluşturulmadı. Gerçek uygulamada
          sipariş sunucuda tek işlemde yaratılmalı, fiyat ve stok orada
          yeniden doğrulanmalıdır.
        </div>
      ) : null}

      {sepet.lines.length === 0 ? (
        <div className="card">
          <p className="note">
            Sepetiniz boş. <Link href="/lastik">Lastik aramaya başlayın</Link>.
          </p>
        </div>
      ) : (
        <div className="cart-layout">
          {/* SOL: teslimat adresi + ödeme yöntemi */}
          <div className="cart-left">
            <DeliveryAddress />

            <div className="cart-card payment-method-card">
              <h2 className="cart-card-title">Ödeme Yöntemi</h2>
              {pricing && pricing.methods.length > 0 ? (
                <div className="payment-grid">
                  {pricing.methods.map((m) => {
                    const ind = computeDiscountedTotals(sepet.lines, pricing, m.id).indirimToplamKurus;
                    const secili = m.id === paymentId;
                    return (
                      <label
                        key={m.id}
                        className={`payment-option${secili ? " secili" : ""}`}
                      >
                        <div className="po-top">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={secili}
                            onChange={() => setPaymentId(m.id)}
                          />
                          <div className="po-info">
                            <div className="po-title">{m.title}</div>
                          </div>
                        </div>
                        <div className="po-discount">
                          {m.discountPct > 0 ? `İskonto %${m.discountPct}` : "İskonto yok"}
                        </div>
                        {ind > 0 ? (
                          <div className="po-discount-amount">≈ {formatKurus(ind)} indirim</div>
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
          </div>

          {/* SAĞ: ürünler + sipariş özeti */}
          <aside className="cart-right">
            <div className="cart-card">
              <h2 className="cart-card-title">Sepetiniz</h2>
              {sepet.lines.map((s) => {
                const disc = lineDiscountPct(pricing, s.urun.marka, paymentId);
                const satirKurus = Math.round(s.kdvDahilBirimKurus * s.adet * (1 - disc / 100));
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
                        {disc > 0 ? <span className="cli-indirim">%{disc} iskonto</span> : null}
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

              {/* Sepetiniz kartının altında özet */}
              <div className="cart-summary">
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
                  onClick={() => {
                    setSubmitted(true);
                    router.push("/siparisler");
                  }}
                >
                  Sipariş Ver
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
