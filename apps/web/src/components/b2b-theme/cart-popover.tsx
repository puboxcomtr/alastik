"use client";

import { useEffect, useRef, useState } from "react";
import { CartIcon } from "@components/b2b-theme/icons";
import { AddToCart } from "@components/b2b-theme/add-to-cart";
import type { CartSnapshot } from "@components/b2b-theme/cart-status";
import type { StockRow } from "@components/b2b-theme/lib/sample-data";

const WIDTH = 260;

export function CartPopover({
  productId,
  warehouses,
  defaultWarehouseId,
  product,
}: {
  productId: string;
  warehouses: StockRow[];
  defaultWarehouseId?: string;
  product?: Omit<CartSnapshot, "warehouseName">;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function close() {
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", close, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", close, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      let left = r.right - WIDTH;
      if (left < 8) left = 8;
      setPos({ top: r.bottom + 6, left });
    }
    setOpen((o) => !o);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="action-icon"
        title="Sepete Ekle"
        aria-label="Sepete Ekle"
        onClick={toggle}
      >
        <CartIcon size={16} />
      </button>
      {open ? (
        <div
          ref={popRef}
          className="cart-popover"
          style={{ top: pos.top, left: pos.left, width: WIDTH }}
          role="dialog"
        >
          <AddToCart productId={productId} warehouses={warehouses} defaultWarehouseId={defaultWarehouseId} product={product} />
        </div>
      ) : null}
    </>
  );
}
