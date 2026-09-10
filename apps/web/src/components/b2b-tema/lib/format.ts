/**
 * Biçimlendirme yardımcıları.
 *
 * Tutarlar tam sayı **kuruş** olarak tutulur (1 TL = 100). Kayan noktalı sayı
 * kullanılmaz; para hesabında yuvarlama hatası birikmesin diye bu şablonda da
 * aynı alışkanlık korunmuştur. Gerçek veri kaynağına bağlanırken tutarları
 * kuruş tam sayısı olarak vermek yeterlidir.
 */

const TL = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatKurus(kurus: number): string {
  return TL.format(kurus / 100);
}

export function formatTarih(d: Date): string {
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Sadece gün/ay/yıl — vade ve belge tarihlerinde saat gürültü yapıyor. */
export function gunFormat(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const DURUM_ETIKET: Record<string, string> = {
  DRAFT: "Taslak",
  SUBMITTED: "Alındı",
  CONFIRMED: "Onaylandı",
  PREPARING: "Hazırlanıyor",
  SHIPPED: "Kargoda",
  DELIVERED: "Teslim",
  CANCELLED: "İptal",
};
