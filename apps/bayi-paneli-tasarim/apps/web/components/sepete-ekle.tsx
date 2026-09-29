"use client";

import { useSepet } from "./sepet-durumu";
import { CartIcon } from "./icons";
import type { StokSatiri } from "@/lib/ornek-veri";

/**
 * Ürün satırındaki sepet kontrolü.
 *
 *  - Ürün sepette DEĞİLSE: yalnızca sepet düğmesi (kolon bu genişlikte kalır,
 *    önceden yer AYRILMAZ).
 *  - Basılınca adet kutusu açılır ve kolon o anda genişler.
 *  - Sepetteyken satırda  [− adet +]  ve altında "Vazgeç" durur.
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

  const maks = Math.min(depo?.kullanilabilir ?? 0, 500);

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
          onClick={() => guncelle(sepetteki.adet - 1)}
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
          onClick={() => guncelle(sepetteki.adet + 1)}
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
        onClick={() => sepet.cikar(productId, sepetteki.warehouseId)}
      >
        Vazgeç
      </button>
    </div>
  );
}
