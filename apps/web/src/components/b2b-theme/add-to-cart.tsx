"use client";

import { useCart, type CartSnapshot } from "./cart-status";
import { showToast } from "./toast";
import { CartIcon } from "./icons";
import type { StockRow } from "@components/b2b-theme/lib/sample-data";

export function AddToCart({
  productId,
  warehouses,
  defaultWarehouseId,
  initialQty = 1,
  product,
}: {
  productId: string;
  warehouses: StockRow[];
  defaultWarehouseId?: string | undefined;
  initialQty?: number;
  product?: Omit<CartSnapshot, "warehouseName">;
}) {
  const sepet = useCart();
    const cartItem = sepet.find(productId);

  const depo =
    (cartItem
      ? warehouses.find((d) => d.warehouseId === cartItem.warehouseId)
      : undefined) ??
    warehouses.find((d) => d.warehouseId === defaultWarehouseId) ??
    [...warehouses].sort((a, b) => b.available - a.available)[0];

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
          const added = sepet.addItem({
            productId,
            warehouseId: depo.warehouseId,
            adet: Math.max(1, Math.min(initialQty, maks || 1)),
            snapshot: product
              ? { ...product, warehouseName: depo.warehouseName }
              : undefined,
          });
          if (added) showToast("Sepete eklendi", "ok");
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
    <div className="row-cart">
      <span className="stepper acikta">
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
            if (update(cartItem.adet + 1)) showToast("Adet güncellendi", "ok");
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
