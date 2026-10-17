// Cari hareketindeki faturanın resmi e-Fatura / e-Arşiv PDF'ini yeni sekmede açar (Cari Hareketler ve Ödemelerim ortak).
// PDF tarayıcının görüntüleyicisinde açılır; indirme oradan yapılabilir.
import { API_ENDPOINTS } from "@src/config/api";

export interface InvoiceMovement {
  tur?: string;
  fisno: string;
  belgeNo?: string;
  tarih?: string;
}

// Yeni sekmede açılan PDF adresinin geçerli kalma süresi
const PDF_URL_LIFETIME_MS = 60 * 1000;
const OPEN_FAILED_MESSAGE = "Fatura şu an açılamadı.";

/** DIA hareket türü "... (Fatura)" olan ve fiş numarası bulunan hareket faturadır */
export const isInvoiceMovement = (m: InvoiceMovement) => /\(Fatura\)\s*$/.test(m.tur || "") && !!m.fisno;

/** Hareketin tekil anahtarı (düğme bekleme göstergesi için) */
export const invoiceMovementKey = (m: InvoiceMovement) => `${m.fisno}|${m.belgeNo || ""}|${m.tarih || ""}`;

/**
 * Faturayı yeni sekmede açar. Sekme tıklama anında açılmalıdır (beklemeden sonra açılan pencereyi tarayıcılar engeller),
 * bu yüzden bu fonksiyon doğrudan tıklama işleyicisinden çağrılmalıdır.
 * @returns hata mesajı; başarılıysa null
 */
export async function openInvoicePdf(m: InvoiceMovement): Promise<string | null> {
  const token = localStorage.getItem("authToken");
  if (!token) return OPEN_FAILED_MESSAGE;
  const tab = window.open("", "_blank");
  try {
    const r = await fetch(API_ENDPOINTS.b2b.faturaPdf({ fisno: m.fisno, belgeNo: m.belgeNo, tarih: m.tarih }), {
      headers: { Authorization: `Bearer ${token}`, "X-Site": "b2b" },
    });
    if (!r.ok) {
      tab?.close();
      const d = await r.json().catch(() => null);
      return d?.message || OPEN_FAILED_MESSAGE;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
    if (tab) tab.location.href = url;
    else window.location.href = url; // açılır pencere engellendiyse aynı sekmede aç
    window.setTimeout(() => URL.revokeObjectURL(url), PDF_URL_LIFETIME_MS);
    return null;
  } catch {
    tab?.close();
    return OPEN_FAILED_MESSAGE;
  }
}
