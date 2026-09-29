"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSepet } from "./sepet-durumu";
import { formatKurus } from "@/lib/format";
import { ArrowRightIcon, CartIcon, CloseIcon, TrashIcon } from "./icons";

/** Üst bardan açılan sepet paneli. */
export function SepetPaneli() {
  const [acik, setAcik] = useState(false);
  const router = useRouter();
  const sepet = useSepet();

  return (
    <>
      <button
        className="cart-btn"
        onClick={() => setAcik(true)}
        aria-label="Sepeti aç"
      >
        <CartIcon size={19} />
        {sepet.toplamAdet > 0 ? (
          <span className="count">{sepet.toplamAdet}</span>
        ) : null}
      </button>

      {acik ? (
        <div
          className="drawer-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAcik(false);
          }}
        >
          <aside className="drawer">
            <div className="drawer-head">
              <span className="ikon-kutu">
                <CartIcon size={19} />
              </span>
              <div>
                <h2>Sepetim</h2>
                <div className="alt">{sepet.satirlar.length} ürün</div>
              </div>
              <button
                className="kapat"
                onClick={() => setAcik(false)}
                aria-label="Kapat"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="drawer-body">
              {sepet.satirlar.length === 0 ? (
                <p className="note">Sepetiniz boş.</p>
              ) : (
                sepet.satirlar.map((s) => (
                  <div className="satir" key={`${s.productId}:${s.warehouseId}`}>
                    <button
                      className="sil"
                      type="button"
                      aria-label="Kaldır"
                      onClick={() => sepet.cikar(s.productId, s.warehouseId)}
                    >
                      <TrashIcon size={15} />
                    </button>
                    <div className="marka">{s.urun.marka}</div>
                    <div className="ad">
                      {s.urun.ebat} {s.urun.desen}
                    </div>
                    <div className="etiketler">
                      <span className="sku">{s.urun.stokKodu}</span>
                      <span className="badge info">{s.depoAd}</span>
                    </div>
                    <div className="alt-row">
                      <span className="stepper">
                        <button
                          type="button"
                          aria-label="Azalt"
                          onClick={() =>
                            sepet.adetGuncelle(
                              s.productId,
                              s.warehouseId,
                              s.adet - 1,
                            )
                          }
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
                          onClick={() =>
                            sepet.adetGuncelle(
                              s.productId,
                              s.warehouseId,
                              s.adet + 1,
                            )
                          }
                        >
                          +
                        </button>
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <div className="fiyat-kdv">
                          Birim {formatKurus(s.birimNetKurus)}
                        </div>
                        <div className="fiyat-net">
                          {formatKurus(s.satirToplamKurus)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="drawer-foot">
              <div className="toplam-row">
                <div>
                  <div className="label" style={{ fontWeight: 700 }}>
                    Toplam Tutar
                  </div>
                  <div className="note">{sepet.toplamAdet} adet · KDV dahil</div>
                </div>
                <div className="tutar">{formatKurus(sepet.toplamKurus)}</div>
              </div>
              <div className="aksiyon">
                <button
                  className="primary"
                  disabled={sepet.satirlar.length === 0}
                  onClick={() => {
                    setAcik(false);
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
