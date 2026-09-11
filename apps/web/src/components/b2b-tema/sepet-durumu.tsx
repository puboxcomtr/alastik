"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  RIMS,
  VAT_BPS,
  TIRES,
  type Rim,
  type Tire,
} from "@components/b2b-tema/lib/ornek-veri";

/**
 * SEPET — yalnızca tarayıcıda yaşar.
 *
 * Bu şablonda sunucu yoktur; sepet `localStorage`'da tutulur ki tasarım
 * gezilirken ekranlar boş kalmasın. Gerçek uygulamada bu sağlayıcının içi
 * kendi sepet API'nizle değiştirilir — bileşenlerin arayüzü (`useSepet`)
 * aynı kalabilir.
 */

const CART_STORAGE_KEY = "ornek-sepet-v1";

export type CartRecord = {
  productId: string;
  warehouseId: string;
  adet: number;
};

export type CartLine = CartRecord & {
  urun: Tire | Rim;
  warehouseName: string;
  birimNetKurus: number;
  matrahKurus: number;
  kdvKurus: number;
  satirToplamKurus: number;
};

type CartState = {
  records: CartRecord[];
  lines: CartLine[];
  totalQty: number;
  matrahToplamKurus: number;
  kdvToplamKurus: number;
  totalKurus: number;
  addItem: (kayit: CartRecord) => void;
  setQty: (productId: string, warehouseId: string, adet: number) => void;
  removeItem: (productId: string, warehouseId: string) => void;
  clear: () => void;
  find: (productId: string) => CartRecord | null;
};

const Baglam = createContext<CartState | null>(null);

function findProduct(id: string): Tire | Rim | undefined {
  return TIRES.find((l) => l.id === id) ?? RIMS.find((j) => j.id === id);
}

function kayitlariOku(): CartRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const ham = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!ham) return [];
    const cozulen: unknown = JSON.parse(ham);
    if (!Array.isArray(cozulen)) return [];
    return cozulen.filter(
      (k): k is CartRecord =>
        typeof k === "object" &&
        k !== null &&
        typeof (k as CartRecord).productId === "string" &&
        typeof (k as CartRecord).warehouseId === "string" &&
        typeof (k as CartRecord).adet === "number",
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [records, setKayitlar] = useState<CartRecord[]>([]);

  // Sunucuda ve ilk çizimde boş başlanır; kayıtlar bağlanmadan sonra okunur ki
  // sunucu çıktısı ile istemci çıktısı ayrışmasın (hydration uyuşmazlığı).
  useEffect(() => {
    setKayitlar(kayitlariOku());
  }, []);

  const yaz = useCallback((yeni: CartRecord[]) => {
    setKayitlar(yeni);
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(yeni));
    } catch {
      // Depolama kapalıysa sepet yalnızca bu sekmede yaşar; hata gösterilmez.
    }
  }, []);

  const deger = useMemo<CartState>(() => {
    const lines: CartLine[] = records.flatMap((k) => {
      const urun = findProduct(k.productId);
      if (!urun?.fiyat) return [];
      const depo = urun.stocks.find((s) => s.warehouseId === k.warehouseId);
      const matrah = urun.fiyat.birimNetKurus * k.adet;
      const kdv = Math.round((matrah * VAT_BPS) / 10000);
      return [
        {
          ...k,
          urun,
          warehouseName: depo?.warehouseName ?? "—",
          birimNetKurus: urun.fiyat.birimNetKurus,
          matrahKurus: matrah,
          kdvKurus: kdv,
          satirToplamKurus: matrah + kdv,
        },
      ];
    });

    const matrahToplam = lines.reduce((t, s) => t + s.matrahKurus, 0);
    const kdvToplam = lines.reduce((t, s) => t + s.kdvKurus, 0);

    return {
      records,
      lines,
      totalQty: records.reduce((t, k) => t + k.adet, 0),
      matrahToplamKurus: matrahToplam,
      kdvToplamKurus: kdvToplam,
      totalKurus: matrahToplam + kdvToplam,
      addItem: (kayit) => {
        const mevcut = records.find(
          (k) => k.productId === kayit.productId && k.warehouseId === kayit.warehouseId,
        );
        yaz(
          mevcut
            ? records.map((k) =>
                k === mevcut ? { ...k, adet: k.adet + kayit.adet } : k,
              )
            : [...records, kayit],
        );
      },
      setQty: (productId, warehouseId, adet) => {
        if (adet <= 0) {
          yaz(
            records.filter(
              (k) => !(k.productId === productId && k.warehouseId === warehouseId),
            ),
          );
          return;
        }
        yaz(
          records.map((k) =>
            k.productId === productId && k.warehouseId === warehouseId
              ? { ...k, adet }
              : k,
          ),
        );
      },
      removeItem: (productId, warehouseId) => {
        yaz(
          records.filter(
            (k) => !(k.productId === productId && k.warehouseId === warehouseId),
          ),
        );
      },
      clear: () => yaz([]),
      find: (productId) => records.find((k) => k.productId === productId) ?? null,
    };
  }, [records, yaz]);

  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>;
}

export function useCart(): CartState {
  const deger = useContext(Baglam);
  if (!deger) throw new Error("useSepet, SepetSaglayici içinde kullanılmalı");
  return deger;
}
