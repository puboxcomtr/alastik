"use client";

import { useSepet } from "./sepet-durumu";
import { toastGoster } from "./toast";
import { CartIcon } from "./icons";
import type { StokSatiri } from "@components/b2b-tema/lib/ornek-veri";

/**
 * Ürün satırındaki sepet kontrolü.
 *
 *  - Ürün sepette DEĞİLSE: yalnızca sepet düğmesi. Basılınca eklenir ve
 *    "Sepete eklendi" toast'ı gösterilir; adet kutusu açılır.
 *  - Sepetteyken satırda  [− adet +]  ve altında "Vazgeç" durur; Vazgeç
 *    "Sepetten çıkarıldı" toast'ı gösterir.
 *
 * Depo adı satırda yazılmaz: filtrede depo seçiliyse o, değilse stoğu en çok
 * olan depo kullanılır. Adet, deponun kullanılabilir stoğunu aşamaz.
 */
export function SepeteEkle({
  productId,
  depolar,
  varsayilanDepoId,
  baslangicAdet = 1,
}: {
  productId: string;
  depolar: StokSatiri[];
  varsayilanDepoId?: string | undefined;
  /** Eklenirken önerilen adet — jantta en az sipariş miktarı. */
  baslangicAdet?: number;
}) {
  const sepet = useSepet();
    const sepetteki = sepet.bul(productId);

  // Sepetteki satırın deposu esastır; değilse filtre deposu, o da yoksa
  // stoğu en çok olan depo.
  const depo =
    (sepetteki
      ? depolar.find((d) => d.warehouseId === sepetteki.warehouseId)
      : undefined) ??
    depolar.find((d) => d.warehouseId === varsayilanDepoId) ??
    [...depolar].sort((a, b) => b.kullanilabilir - a.kullanilabilir)[0];

  // Depo bulunursa stoğuyla sınırlı; depo eşleşmezse (stok tooltip'i çekilince
  // warehouseId değişebilir) adet kilitlenmesin diye makul bir tavan uygulanır.
  const maks = depo ? Math.min(depo.kullanilabilir, 500) : 500;

  if (!sepetteki) {
    return (
      <button
        className="iconbtn hazir"
        type="button"
        title="Sepete ekle"
        disabled={!depo}
        onClick={() => {
          if (!depo) return;
          sepet.ekle({
            productId,
            warehouseId: depo.warehouseId,
            adet: Math.max(1, Math.min(baslangicAdet, maks || 1)),
          });
          toastGoster("Sepete eklendi", "ok");
        }}
      >
        <CartIcon size={17} />
      </button>
    );
  }

  const guncelle = (adet: number) =>
    sepet.adetGuncelle(
      productId,
      sepetteki.warehouseId,
      Math.max(1, Math.min(adet, maks || 1)),
    );

  return (
    <div className="satir-sepet">
      <span className="stepper acikta">
        {/* Adet 1'in ALTINA inmez; satırı silmek için "Vazgeç" kullanılır. */}
        <button
          type="button"
          onClick={() => {
            guncelle(sepetteki.adet - 1);
            toastGoster("Adet güncellendi", "bilgi");
          }}
          disabled={sepetteki.adet <= 1}
          aria-label="Azalt"
          title={
            sepetteki.adet <= 1 ? "En az 1 adet — kaldırmak için Vazgeç" : "Azalt"
          }
        >
          −
        </button>
        <input readOnly value={sepetteki.adet} aria-label="Adet" tabIndex={-1} />
        <button
          type="button"
          onClick={() => {
            guncelle(sepetteki.adet + 1);
            toastGoster("Adet güncellendi", "ok");
          }}
          disabled={sepetteki.adet >= maks}
          aria-label="Artır"
          title={
            sepetteki.adet >= maks
              ? `Bu depoda en fazla ${maks} adet kullanılabilir`
              : "Artır"
          }
        >
          +
        </button>
      </span>
      <button
        type="button"
        className="vazgec"
        onClick={() => {
          sepet.cikar(productId, sepetteki.warehouseId);
          toastGoster("Sepetten çıkarıldı", "bilgi");
        }}
      >
        Vazgeç
      </button>
    </div>
  );
}
