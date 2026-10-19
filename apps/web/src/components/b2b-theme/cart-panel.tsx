"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./cart-status";
import { showToast } from "./toast";
import { formatKurus } from "@components/b2b-theme/lib/format";
import { AnimatedMoney } from "@components/b2b-theme/animated-money";
import { ArrowRightIcon, CartIcon, CloseIcon, TrashIcon } from "./icons";
import { fetchCartFinancialDiscounts, financialDiscountPct, productShippingKurus, catalogShipping, BASE_PAYMENT_METHOD, type FinancialDiscounts } from "./lib/financial-discounts";

export function CartPanel() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const sepet = useCart();

  const [financial, setFinancial] = useState<FinancialDiscounts>({ tier: "", discounts: {} });
  const cartCodes = sepet.lines.map((l) => l.urun.stockCode).filter(Boolean).sort().join(",");
  useEffect(() => {
    let cancelled = false;
    fetchCartFinancialDiscounts(cartCodes ? cartCodes.split(",") : []).then((result) => {
      if (!cancelled) setFinancial(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cartCodes]);
  const linePct = (line: (typeof sepet.lines)[number]) =>
    line.urun.xml ? 0 : financialDiscountPct(financial.discounts, line.urun.stockCode, BASE_PAYMENT_METHOD) ?? 0;
  const lineShip = (line: (typeof sepet.lines)[number]) => productShippingKurus(catalogShipping(financial), line.urun.stockCode);
  const lineUnitKurus = (line: (typeof sepet.lines)[number]) =>
    Math.round(line.kdvDahilBirimKurus * (1 - linePct(line) / 100)) + (lineShip(line).excluded ? 0 : lineShip(line).kurus);
  const lineTotalKurus = (line: (typeof sepet.lines)[number]) =>
    Math.round(line.kdvDahilBirimKurus * line.adet * (1 - linePct(line) / 100)) + (lineShip(line).excluded ? 0 : lineShip(line).kurus * line.adet);
  const discountedTotalKurus = sepet.lines.reduce((sum, line) => sum + lineTotalKurus(line) + (lineShip(line).excluded ? lineShip(line).kurus * line.adet : 0), 0);

  return (
    <>
      <button
        className="cart-btn"
        data-tip="Sepetim"
        onClick={() => setOpen(true)}
        aria-label="Sepeti aç"
      >
        <CartIcon size={19} />
        {sepet.totalQty > 0 ? (
          <span className="count">{sepet.totalQty}</span>
        ) : null}
      </button>

      {open ? (
        <div
          className="drawer-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <aside className="drawer">
            <div className="drawer-head">
              <span className="icon-box">
                <CartIcon size={19} />
              </span>
              <div>
                <h2>Sepetim</h2>
                <div className="alt">{sepet.lines.length} ürün</div>
              </div>
              <button
                className="kapat"
                onClick={() => setOpen(false)}
                aria-label="Kapat"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="drawer-body">
              {sepet.lines.length === 0 ? (
                <p className="note">Sepetiniz boş.</p>
              ) : (
                sepet.lines.map((s) => (
                  <div className="satir" key={`${s.productId}:${s.warehouseId}`}>
                    <button
                      className="sil"
                      type="button"
                      aria-label="Kaldır"
                      onClick={() => {
                        sepet.removeItem(s.productId, s.warehouseId);
                        showToast("Sepetten çıkarıldı", "bilgi");
                      }}
                    >
                      <TrashIcon size={15} />
                    </button>
                    <div className="satir-ust">
                      {s.urun.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="satir-gorsel"
                          src={s.urun.imageUrl}
                          alt={s.urun.marka}
                          loading="lazy"
                        />
                      ) : (
                        <span className="satir-gorsel bos" aria-hidden="true" />
                      )}
                      <div className="satir-bilgi">
                        <div className="marka">
                          {s.urun.brandLogoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              className="marka-logo"
                              src={s.urun.brandLogoUrl}
                              alt={s.urun.marka}
                              title={s.urun.marka}
                            />
                          ) : (
                            s.urun.marka
                          )}
                        </div>
                        <div className="ad" title={`${s.urun.size} ${s.urun.pattern}`}>
                          {s.urun.size} {s.urun.pattern}
                        </div>
                        <div className="etiketler">
                          <span className="sku">{s.urun.stockCode}</span>
                        </div>
                      </div>
                    </div>
                    <div className="alt-row">
                      <span className="stepper">
                        <button
                          type="button"
                          aria-label="Azalt"
                          onClick={() => {
                            sepet.setQty(s.productId, s.warehouseId, s.adet - 1);
                            showToast(s.adet - 1 <= 0 ? "Sepetten çıkarıldı" : "Adet güncellendi", "bilgi");
                          }}
                        >
                          −
                        </button>
                        <input
                          readOnly
                          value={s.adet}
                          aria-label="Adet"
                          tabIndex={-1}
                        />
                        <button
                          type="button"
                          aria-label="Artır"
                          onClick={() => {
                            if (sepet.setQty(s.productId, s.warehouseId, s.adet + 1)) showToast("Adet güncellendi", "ok");
                          }}
                        >
                          +
                        </button>
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <div className="price-vat">
                          Birim {formatKurus(lineUnitKurus(s))}
                        </div>
                        <div className="price-net">
                          <AnimatedMoney kurus={lineTotalKurus(s)} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="drawer-foot">
              <div className="total-row">
                <div>
                  <div className="label" style={{ fontWeight: 700 }}>
                    Toplam Tutar
                  </div>
                </div>
                <div className="tutar"><AnimatedMoney kurus={discountedTotalKurus} /></div>
              </div>
              <div className="aksiyon">
                <button
                  className="primary"
                  disabled={sepet.lines.length === 0}
                  onClick={() => {
                    setOpen(false);
                    router.push("/sepet");
                  }}
                >
                  Siparişi Tamamla <ArrowRightIcon size={16} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
