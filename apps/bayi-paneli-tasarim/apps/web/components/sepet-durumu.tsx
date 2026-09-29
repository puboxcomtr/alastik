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
  JANTLAR,
  KDV_BPS,
  LASTIKLER,
  type Jant,
  type Lastik,
} from "@/lib/ornek-veri";

/**
 * SEPET — yalnızca tarayıcıda yaşar.
 *
 * Bu şablonda sunucu yoktur; sepet `localStorage`'da tutulur ki tasarım
 * gezilirken ekranlar boş kalmasın. Gerçek uygulamada bu sağlayıcının içi
 * kendi sepet API'nizle değiştirilir — bileşenlerin arayüzü (`useSepet`)
 * aynı kalabilir.
 */

const DEPO_ANAHTARI = "ornek-sepet-v1";

export type SepetKaydi = {
  productId: string;
  warehouseId: string;
  adet: number;
};

export type SepetSatiri = SepetKaydi & {
  urun: Lastik | Jant;
  depoAd: string;
  birimNetKurus: number;
  matrahKurus: number;
  kdvKurus: number;
  satirToplamKurus: number;
};

type SepetDurumu = {
  kayitlar: SepetKaydi[];
  satirlar: SepetSatiri[];
  toplamAdet: number;
  matrahToplamKurus: number;
  kdvToplamKurus: number;
  toplamKurus: number;
  ekle: (kayit: SepetKaydi) => void;
  adetGuncelle: (productId: string, warehouseId: string, adet: number) => void;
  cikar: (productId: string, warehouseId: string) => void;
  temizle: () => void;
  bul: (productId: string) => SepetKaydi | null;
};

const Baglam = createContext<SepetDurumu | null>(null);

function urunBul(id: string): Lastik | Jant | undefined {
  return LASTIKLER.find((l) => l.id === id) ?? JANTLAR.find((j) => j.id === id);
}

function kayitlariOku(): SepetKaydi[] {
  if (typeof window === "undefined") return [];
  try {
    const ham = window.localStorage.getItem(DEPO_ANAHTARI);
    if (!ham) return [];
    const cozulen: unknown = JSON.parse(ham);
    if (!Array.isArray(cozulen)) return [];
    return cozulen.filter(
      (k): k is SepetKaydi =>
        typeof k === "object" &&
        k !== null &&
        typeof (k as SepetKaydi).productId === "string" &&
        typeof (k as SepetKaydi).warehouseId === "string" &&
        typeof (k as SepetKaydi).adet === "number",
    );
  } catch {
    return [];
  }
}

export function SepetSaglayici({ children }: { children: React.ReactNode }) {
  const [kayitlar, setKayitlar] = useState<SepetKaydi[]>([]);

  // Sunucuda ve ilk çizimde boş başlanır; kayıtlar bağlanmadan sonra okunur ki
  // sunucu çıktısı ile istemci çıktısı ayrışmasın (hydration uyuşmazlığı).
  useEffect(() => {
    setKayitlar(kayitlariOku());
  }, []);

  const yaz = useCallback((yeni: SepetKaydi[]) => {
    setKayitlar(yeni);
    try {
      window.localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(yeni));
    } catch {
      // Depolama kapalıysa sepet yalnızca bu sekmede yaşar; hata gösterilmez.
    }
  }, []);

  const deger = useMemo<SepetDurumu>(() => {
    const satirlar: SepetSatiri[] = kayitlar.flatMap((k) => {
      const urun = urunBul(k.productId);
      if (!urun?.fiyat) return [];
      const depo = urun.stoklar.find((s) => s.warehouseId === k.warehouseId);
      const matrah = urun.fiyat.birimNetKurus * k.adet;
      const kdv = Math.round((matrah * KDV_BPS) / 10000);
      return [
        {
          ...k,
          urun,
          depoAd: depo?.depoAd ?? "—",
          birimNetKurus: urun.fiyat.birimNetKurus,
          matrahKurus: matrah,
          kdvKurus: kdv,
          satirToplamKurus: matrah + kdv,
        },
      ];
    });

    const matrahToplam = satirlar.reduce((t, s) => t + s.matrahKurus, 0);
    const kdvToplam = satirlar.reduce((t, s) => t + s.kdvKurus, 0);

    return {
      kayitlar,
      satirlar,
      toplamAdet: kayitlar.reduce((t, k) => t + k.adet, 0),
      matrahToplamKurus: matrahToplam,
      kdvToplamKurus: kdvToplam,
      toplamKurus: matrahToplam + kdvToplam,
      ekle: (kayit) => {
        const mevcut = kayitlar.find(
          (k) => k.productId === kayit.productId && k.warehouseId === kayit.warehouseId,
        );
        yaz(
          mevcut
            ? kayitlar.map((k) =>
                k === mevcut ? { ...k, adet: k.adet + kayit.adet } : k,
              )
            : [...kayitlar, kayit],
        );
      },
      adetGuncelle: (productId, warehouseId, adet) => {
        if (adet <= 0) {
          yaz(
            kayitlar.filter(
              (k) => !(k.productId === productId && k.warehouseId === warehouseId),
            ),
          );
          return;
        }
        yaz(
          kayitlar.map((k) =>
            k.productId === productId && k.warehouseId === warehouseId
              ? { ...k, adet }
              : k,
          ),
        );
      },
      cikar: (productId, warehouseId) => {
        yaz(
          kayitlar.filter(
            (k) => !(k.productId === productId && k.warehouseId === warehouseId),
          ),
        );
      },
      temizle: () => yaz([]),
      bul: (productId) => kayitlar.find((k) => k.productId === productId) ?? null,
    };
  }, [kayitlar, yaz]);

  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>;
}

export function useSepet(): SepetDurumu {
  const deger = useContext(Baglam);
  if (!deger) throw new Error("useSepet, SepetSaglayici içinde kullanılmalı");
  return deger;
}
