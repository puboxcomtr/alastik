"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  RIMS,
  VAT_BPS,
  TIRES,
  type Rim,
  type Season,
  type Tire,
} from "@components/b2b-theme/lib/sample-data";
import { API_ENDPOINTS } from "@src/config/api";
import { CartBlockedModal } from "./cart-blocked-modal";

/**
 * SEPET — yalnızca tarayıcıda yaşar.
 *
 * Bu şablonda sunucu yoktur; sepet `localStorage`'da tutulur ki tasarım
 * gezilirken ekranlar boş kalmasın. Gerçek uygulamada bu sağlayıcının içi
 * kendi sepet API'nizle değiştirilir — bileşenlerin arayüzü (`useSepet`)
 * aynı kalabilir.
 */

const CART_STORAGE_KEY = "ornek-sepet-v1";
// Sepet değişikliklerinin sunucuya yazılmadan önce toplandığı süre
const CART_SYNC_DELAY_MS = 1500;

// Ürün sepete eklenirken GERÇEK verisinin (DB'den gelen ad/fiyat/depo) anlık
// kopyası — sepet widget'ı bu değerleri örnek veriden değil bundan gösterir.
// (Nihai fiyat/stok siparişte sunucuda yeniden doğrulanır.)
export type CartSnapshot = {
  marka: string;
  brandLogoUrl?: string | null;
  size: string;
  pattern: string;
  stockCode: string;
  /** DIA'daki gerçek stok kodu (XML üründe "-XML" ekli) — siparişe bu gönderilir */
  diaStockCode?: string;
  imageUrl?: string | null;
  dotYear?: number | null;
  mevsim?: Season;
  birimNetKurus: number; // KDV hariç birim fiyat
  kdvDahilBirimKurus: number;
  warehouseName?: string;
  xml?: boolean; // XML (tedarikçi) ürün — ödeme yöntemi iskontosu uygulanmaz
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
  diaStockCode?: string;
  marka: string;
  brandLogoUrl: string | null;
  size: string;
  pattern: string;
  imageUrl: string | null;
  dotYear: number | null;
  mevsim: Season;
  xml?: boolean;
};

export type CartLine = CartRecord & {
  urun: CartLineProduct;
  warehouseName: string;
  birimNetKurus: number;
  kdvDahilBirimKurus: number; // KDV dahil birim fiyat (b2b'de gösterilen)
  matrahKurus: number;
  kdvKurus: number;
  satirToplamKurus: number;
};

type CartState = {
  hydrated: boolean;
  records: CartRecord[];
  lines: CartLine[];
  totalQty: number;
  matrahToplamKurus: number;
  kdvToplamKurus: number;
  totalKurus: number;
  /** Sepet kapalıysa (vadesi geçen borç) eklemez, uyarıyı açar ve false döner. */
  addItem: (record: CartRecord) => boolean;
  /** Adet artışı sepet kapalıyken yapılmaz (uyarı açılır, false döner); azaltma ve silme serbesttir. */
  setQty: (productId: string, warehouseId: string, adet: number) => boolean;
  removeItem: (productId: string, warehouseId: string) => void;
  clear: () => void;
  find: (productId: string) => CartRecord | null;
  /** Vadesi geçen borç nedeniyle sepete ekleme ve sipariş kapalı mı? */
  blocked: boolean;
  /** Kapalıyken ortadaki uyarıyı açar. */
  notifyBlocked: () => void;
};

// Sepeti kapatan cari durumu (/me → cartClosed)
type CartBlock = { message: string; overdueKurus: number };

const CartContext = createContext<CartState | null>(null);

function findProduct(id: string): Tire | Rim | undefined {
  return TIRES.find((l) => l.id === id) ?? RIMS.find((j) => j.id === id);
}

function readRecords(): CartRecord[] {
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

/** Tarayıcıdaki sepeti siler (plasiyer çıkışında: plasiyerin bayiler adına doldurduğu sepet sonraki oturuma kalmasın). */
export function clearStoredCart(): void {
  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    /* depolama kapalıysa silinecek sepet de yoktur */
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<CartRecord[]>([]);
  // localStorage'dan ilk okuma yapıldı mı? (boş-sepet yönlendirmesi bunu bekler;
  // yoksa dolu sepette bile ilk çizimde yanlışlıkla yönlendirme olur.)
  const [hydrated, setHydrated] = useState(false);
  // Vadesi geçen borç: sepete ekleme ve sipariş kapalı (kuralı sunucu da uygular)
  const [block, setBlock] = useState<CartBlock | null>(null);
  const [blockNoticeOpen, setBlockNoticeOpen] = useState(false);

  // Sunucuda ve ilk çizimde boş başlanır; kayıtlar bağlanmadan sonra okunur ki
  // sunucu çıktısı ile istemci çıktısı ayrışmasın (hydration uyuşmazlığı).
  useEffect(() => {
    setRecords(readRecords());
    setHydrated(true);
  }, []);

  // Sepetteki fiyat, ürünün eklendiği andaki kopyadır. Sayfa açılışında bir kez katalogdaki güncel fiyatla yenilenir;
  // fiyat değişince ya da düzeltilince bayi sepette eski fiyatı görmez. Nihai fiyat siparişte sunucuda hesaplanır.
  // Cari oranı alınamazsa fiyat hesaplanmaz, sepet olduğu gibi kalır.
  const repriced = useRef(false);
  useEffect(() => {
    if (!hydrated || repriced.current) return;
    const priced = records.filter((r) => r.snapshot?.stockCode);
    if (!priced.length) return;
    let token: string | null = null;
    try {
      token = window.localStorage.getItem("authToken");
    } catch {
      token = null;
    }
    if (!token) return;
    repriced.current = true;
    (async () => {
      try {
        const { rawToTire } = await import("./showcase-catalog");
        const rate = await fetch(API_ENDPOINTS.b2b.fiyatOrani(), { headers: { Authorization: `Bearer ${token}`, "X-Site": "b2b" } })
          .then((r) => r.json());
        if (!rate?.success || !rate.data) return;
        const fresh = new Map<string, { birimNetKurus: number; kdvDahilBirimKurus: number }>();
        await Promise.all(priced.map(async (r) => {
          const code = r.snapshot!.diaStockCode || r.snapshot!.stockCode;
          const params = new URLSearchParams({ q: code, limit: "5", page: "1" });
          const res = await fetch(`${API_ENDPOINTS.products.filter()}?${params.toString()}`, { headers: { "X-Site": "b2b" } })
            .then((x) => x.json())
            .catch(() => null);
          const raw = (res?.data?.products || res?.products || []).find((p: { _key?: unknown }) => String(p?._key) === r.productId);
          const fiyat = raw ? rawToTire(raw, {}, rate.data).fiyat : null;
          if (fiyat && fiyat.kdvDahilBirimKurus > 0) {
            fresh.set(r.productId, { birimNetKurus: fiyat.birimNetKurus, kdvDahilBirimKurus: fiyat.kdvDahilBirimKurus });
          }
        }));
        if (!fresh.size) return;
        setRecords((current) => {
          let changed = false;
          const next = current.map((r) => {
            const f = fresh.get(r.productId);
            if (!f || !r.snapshot) return r;
            if (f.kdvDahilBirimKurus === r.snapshot.kdvDahilBirimKurus && f.birimNetKurus === r.snapshot.birimNetKurus) return r;
            changed = true;
            return { ...r, snapshot: { ...r.snapshot, ...f } };
          });
          if (!changed) return current;
          try {
            window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // Depolama kapalıysa güncel fiyat yalnızca bu sekmede geçerli olur.
          }
          return next;
        });
      } catch {
        // Fiyat yenilenemezse sepet eklendiği andaki fiyatla kalır; sipariş tutarı sunucuda hesaplanır.
      }
    })();
    // Yalnız ilk okumadan sonra bir kez çalışır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Sepet sunucuya da yazılır (admin Aktif Sepetler bayi sepetlerini görür). Değişiklikler kısa süre toplanıp
  // tek istekle gider; aynı içerik tekrar gönderilmez. Bayi oturumu yoksa (plasiyer bayi seçmeden) gönderilmez.
  const lastSyncedCart = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const lines = records.filter((r) => r.snapshot).map((r) => ({
      productId: r.productId,
      stockCode: r.snapshot!.stockCode,
      diaStockCode: r.snapshot!.diaStockCode,
      name: r.snapshot!.pattern,
      brand: r.snapshot!.marka,
      image: r.snapshot!.imageUrl ?? "",
      quantity: r.adet,
      unitPrice: r.snapshot!.kdvDahilBirimKurus / 100,
      warehouseName: r.snapshot!.warehouseName ?? "",
      xml: !!r.snapshot!.xml,
    }));
    const body = JSON.stringify({ lines });
    if (body === lastSyncedCart.current) return;
    const timer = window.setTimeout(() => {
      let token: string | null = null;
      try {
        token = window.localStorage.getItem("authToken");
      } catch {
        token = null;
      }
      if (!token) return;
      fetch(API_ENDPOINTS.b2b.sepet(), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Site": "b2b" },
        body,
        keepalive: true,
      })
        .then((r) => { if (r.ok) lastSyncedCart.current = body; })
        .catch(() => { /* kayıt gitmezse bir sonraki değişiklikte yeniden denenir */ });
    }, CART_SYNC_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [records, hydrated]);

  // Cari durumu sayfa açılışında ve sekmeye dönüldüğünde okunur (borç ödenince kilit kalksın)
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      let token: string | null = null;
      try {
        token = window.localStorage.getItem("authToken");
      } catch {
        token = null;
      }
      if (!token) return;
      fetch(API_ENDPOINTS.b2b.me(), { headers: { Authorization: `Bearer ${token}`, "X-Site": "b2b" } })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !d?.success || !d.data) return;
          setBlock(
            d.data.cartClosed === true
              ? { message: String(d.data.cartClosedMessage || ""), overdueKurus: Number(d.data.overdueKurus) || 0 }
              : null,
          );
        })
        .catch(() => {});
    };
    load();
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", load);
    };
  }, []);

  const writeRecords = useCallback((nextRecords: CartRecord[]) => {
    setRecords(nextRecords);
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextRecords));
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
              diaStockCode: s.diaStockCode,
              marka: s.marka,
              brandLogoUrl: s.brandLogoUrl ?? null,
              size: s.size,
              pattern: s.pattern,
              imageUrl: s.imageUrl ?? null,
              dotYear: s.dotYear ?? null,
              mevsim: s.mevsim ?? "yaz",
              xml: s.xml ?? false,
            },
            warehouseName: s.warehouseName ?? "—",
            birimNetKurus: s.birimNetKurus,
            kdvDahilBirimKurus: s.kdvDahilBirimKurus,
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
            dotYear: "dotYear" in urun ? urun.dotYear : null,
            mevsim: "mevsim" in urun ? urun.mevsim : "yaz",
            xml: "xml" in urun ? urun.xml : false,
          },
          warehouseName: depo?.warehouseName ?? "—",
          birimNetKurus: urun.fiyat.birimNetKurus,
          kdvDahilBirimKurus: urun.fiyat.kdvDahilBirimKurus,
          matrahKurus: matrah,
          kdvKurus: kdv,
          satirToplamKurus: matrah + kdv,
        },
      ];
    });

    const matrahToplam = lines.reduce((t, s) => t + s.matrahKurus, 0);
    const kdvToplam = lines.reduce((t, s) => t + s.kdvKurus, 0);

    return {
      hydrated,
      records,
      lines,
      // Badge/sayaç: yalnız GÖRÜNEN satırlardan (çözülemeyen eski kayıtlar sayılmaz)
      totalQty: lines.reduce((t, s) => t + s.adet, 0),
      matrahToplamKurus: matrahToplam,
      kdvToplamKurus: kdvToplam,
      totalKurus: matrahToplam + kdvToplam,
      addItem: (record) => {
        if (block) {
          setBlockNoticeOpen(true);
          return false;
        }
        const existing = records.find(
          (k) => k.productId === record.productId && k.warehouseId === record.warehouseId,
        );
        writeRecords(
          existing
            ? records.map((k) =>
                k === existing ? { ...k, adet: k.adet + record.adet } : k,
              )
            : [...records, record],
        );
        return true;
      },
      setQty: (productId, warehouseId, adet) => {
        if (adet <= 0) {
          writeRecords(
            records.filter(
              (k) => !(k.productId === productId && k.warehouseId === warehouseId),
            ),
          );
          return true;
        }
        const current = records.find(
          (k) => k.productId === productId && k.warehouseId === warehouseId,
        );
        if (block && current && adet > current.adet) {
          setBlockNoticeOpen(true);
          return false;
        }
        writeRecords(
          records.map((k) =>
            k.productId === productId && k.warehouseId === warehouseId
              ? { ...k, adet }
              : k,
          ),
        );
        return true;
      },
      removeItem: (productId, warehouseId) => {
        writeRecords(
          records.filter(
            (k) => !(k.productId === productId && k.warehouseId === warehouseId),
          ),
        );
      },
      clear: () => writeRecords([]),
      find: (productId) => records.find((k) => k.productId === productId) ?? null,
      blocked: block !== null,
      notifyBlocked: () => {
        if (block) setBlockNoticeOpen(true);
      },
    };
  }, [hydrated, records, writeRecords, block]);

  return (
    <CartContext.Provider value={value}>
      {children}
      {block && blockNoticeOpen ? (
        <CartBlockedModal
          message={block.message}
          overdueKurus={block.overdueKurus}
          onClose={() => setBlockNoticeOpen(false)}
        />
      ) : null}
    </CartContext.Provider>
  );
}

export function useCart(): CartState {
  const value = useContext(CartContext);
  if (!value) throw new Error("useSepet, SepetSaglayici içinde kullanılmalı");
  return value;
}
