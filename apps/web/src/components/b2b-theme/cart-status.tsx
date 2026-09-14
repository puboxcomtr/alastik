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
} from "@components/b2b-theme/lib/sample-data";

/**
 * SEPET — yalnızca tarayıcıda yaşar.
 *
 * Bu şablonda sunucu yoktur; sepet `localStorage`'da tutulur ki tasarım
 * gezilirken ekranlar boş kalmasın. Gerçek uygulamada bu sağlayıcının içi
 * kendi sepet API'nizle değiştirilir — bileşenlerin arayüzü (`useSepet`)
 * aynı kalabilir.
 */

const CART_STORAGE_KEY = "ornek-sepet-v1";

// Ürün sepete eklenirken GERÇEK verisinin (DB'den gelen ad/fiyat/depo) anlık
// kopyası — sepet widget'ı bu değerleri örnek veriden değil bundan gösterir.
// (Nihai fiyat/stok siparişte sunucuda yeniden doğrulanır.)
export type CartSnapshot = {
  marka: string;
  brandLogoUrl?: string | null;
  size: string;
  pattern: string;
  stockCode: string;
  imageUrl?: string | null;
  birimNetKurus: number; // KDV hariç birim fiyat
  kdvDahilBirimKurus: number;
  warehouseName?: string;
};

export type CartRecord = {
  productId: string;
  warehouseId: string;
  adet: number;
  snapshot?: CartSnapshot;
};

// Sepet satırındaki ürünün gösterim alt kümesi (hem gerçek snapshot hem örnek
// veri bu şekle indirgenir; UI yalnız bu alanları kullanır).
export type CartLineProduct = {
  id: string;
  stockCode: string;
  marka: string;
  brandLogoUrl: string | null;
  size: string;
  pattern: string;
  imageUrl: string | null;
};

export type CartLine = CartRecord & {
  urun: CartLineProduct;
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
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const cozulen: unknown = JSON.parse(raw);
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

  const value = useMemo<CartState>(() => {
    const lines: CartLine[] = records.flatMap((k) => {
      // Gerçek ürün: eklenirken kaydedilen snapshot'tan (DB değerleri)
      if (k.snapshot) {
        const s = k.snapshot;
        const matrah = s.birimNetKurus * k.adet;
        const kdv = Math.round((matrah * VAT_BPS) / 10000);
        return [
          {
            ...k,
            urun: {
              id: k.productId,
              stockCode: s.stockCode,
              marka: s.marka,
              brandLogoUrl: s.brandLogoUrl ?? null,
              size: s.size,
              pattern: s.pattern,
              imageUrl: s.imageUrl ?? null,
            },
            warehouseName: s.warehouseName ?? "—",
            birimNetKurus: s.birimNetKurus,
            matrahKurus: matrah,
            kdvKurus: kdv,
            satirToplamKurus: matrah + kdv,
          },
        ];
      }
      // Snapshot yoksa (örnek veri / eski kayıt) örnek veriden çöz
      const urun = findProduct(k.productId);
      if (!urun?.fiyat) return [];
      const depo = urun.stocks.find((s) => s.warehouseId === k.warehouseId);
      const matrah = urun.fiyat.birimNetKurus * k.adet;
      const kdv = Math.round((matrah * VAT_BPS) / 10000);
      return [
        {
          ...k,
          urun: {
            id: urun.id,
            stockCode: urun.stockCode,
            marka: urun.marka,
            brandLogoUrl: ("brandLogoUrl" in urun ? urun.brandLogoUrl : null) ?? null,
            size: urun.size,
            pattern: urun.pattern,
            imageUrl: urun.imageUrl ?? null,
          },
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

  return <Baglam.Provider value={value}>{children}</Baglam.Provider>;
}

export function useCart(): CartState {
  const value = useContext(Baglam);
  if (!value) throw new Error("useSepet, SepetSaglayici içinde kullanılmalı");
  return value;
}
