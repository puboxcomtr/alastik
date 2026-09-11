"use client";

import { useCart } from "./sepet-durumu";
import { showToast } from "./toast";
import { CartIcon } from "./icons";
import type { StockRow } from "@components/b2b-tema/lib/ornek-veri";

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
export function AddToCart({
  productId,
  warehouses,
  defaultWarehouseId,
  initialQty = 1,
}: {
  productId: string;
  warehouses: StockRow[];
  defaultWarehouseId?: string | undefined;
  /** Eklenirken önerilen adet — jantta en az sipariş miktarı. */
  initialQty?: number;
}) {
  const sepet = useCart();
    const cartItem = sepet.find(productId);

  // Sepetteki satırın deposu esastır; değilse filtre deposu, o da yoksa
  // stoğu en çok olan depo.
  const depo =
    (cartItem
      ? warehouses.find((d) => d.warehouseId === cartItem.warehouseId)
      : undefined) ??
    warehouses.find((d) => d.warehouseId === defaultWarehouseId) ??
    [...warehouses].sort((a, b) => b.available - a.available)[0];

  // Depo bulunursa stoğuyla sınırlı; depo eşleşmezse (stok tooltip'i çekilince
  // warehouseId değişebilir) adet kilitlenmesin diye makul bir tavan uygulanır.
  const maks = depo ? Math.min(depo.available, 500) : 500;

  if (!cartItem) {
    return (
      <button
        className="iconbtn hazir"
        type="button"
        title="Sepete ekle"
        disabled={!depo}
        onClick={() => {
          if (!depo) return;
          sepet.addItem({
            productId,
            warehouseId: depo.warehouseId,
            adet: Math.max(1, Math.min(initialQty, maks || 1)),
          });
          showToast("Sepete eklendi", "ok");
        }}
      >
        <CartIcon size={17} />
      </button>
    );
  }

  const update = (adet: number) =>
    sepet.setQty(
      productId,
      cartItem.warehouseId,
      Math.max(1, Math.min(adet, maks || 1)),
    );

  return (
    <div className="satir-sepet">
      <span className="stepper acikta">
        {/* Adet 1'in ALTINA inmez; satırı silmek için "Vazgeç" kullanılır. */}
        <button
          type="button"
          onClick={() => {
            update(cartItem.adet - 1);
            showToast("Adet güncellendi", "bilgi");
          }}
          disabled={cartItem.adet <= 1}
          aria-label="Azalt"
          title={
            cartItem.adet <= 1 ? "En az 1 adet — kaldırmak için Vazgeç" : "Azalt"
          }
        >
          −
        </button>
        <input readOnly value={cartItem.adet} aria-label="Adet" tabIndex={-1} />
        <button
          type="button"
          onClick={() => {
            update(cartItem.adet + 1);
            showToast("Adet güncellendi", "ok");
          }}
          disabled={cartItem.adet >= maks}
          aria-label="Artır"
          title={
            cartItem.adet >= maks
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
          sepet.removeItem(productId, cartItem.warehouseId);
          showToast("Sepetten çıkarıldı", "bilgi");
        }}
      >
        Vazgeç
      </button>
    </div>
  );
}
