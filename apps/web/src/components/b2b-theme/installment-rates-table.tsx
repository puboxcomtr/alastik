"use client";
// Bankalara göre taksit seçenekleri — Ödeme Yap sayfasında yalnız "Taksitli" seçiliyken, "Taksitli Öde" düğmesinin altında
// doğrudan gösterilir (düğme / başlık yok). Veri karttan bağımsızdır ve sanal POS sağlayıcısından canlı gelir.
import { useEffect, useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";

type InstallmentTable = { installments: number[]; banks: { name: string; logo?: string | null; rates: Record<string, number> }[] };

// Komisyonsuz taksit "Peşin Fiyatına" olarak etiketlenir; komisyon varsa oranı gösterilir
const termLabel = (rate: number) =>
  rate > 0 ? `%${rate.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} Komisyon` : "Peşin Fiyatına";

export function InstallmentRatesTable() {
  const [table, setTable] = useState<InstallmentTable | null>(null);

  useEffect(() => {
    let token: string | null = null;
    try {
      token = window.localStorage.getItem("authToken");
    } catch {
      token = null;
    }
    if (!token) return;
    fetch(API_ENDPOINTS.b2b.installmentTable(), { headers: { Authorization: `Bearer ${token}`, "X-Site": "b2b" } })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.data?.banks)) setTable(d.data);
      })
      .catch(() => {});
  }, []);

  // Oranlar alınamazsa ya da taksit sunan banka yoksa hiçbir şey gösterilmez
  if (!table || table.banks.length === 0) return null;

  return (
    <section className="installment-rates" aria-label="Kredi kartı taksit oranları">
      <div className="tablewrap">
        <table className="data installment-rates-table">
          <thead>
            <tr>
              <th>Banka</th>
              <th className="rate-col">Taksit Seçeneği</th>
            </tr>
          </thead>
          <tbody>
            {table.banks.map((bank) => (
              <tr key={bank.name}>
                <td>
                  <span className="bank-cell">
                    {/* Logo panelde tanımlıysa gösterilir; dosya açılamazsa gizlenir (kırık görsel çıkmaz) */}
                    {bank.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="bank-logo" src={bank.logo} alt="" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : null}
                    <strong className="bank-name">{bank.name}</strong>
                  </span>
                </td>
                <td className="rate-col">
                  <span className="rate-options">
                    {Object.entries(bank.rates)
                      .map(([count, rate]) => [Number(count), rate] as const)
                      .sort((a, b) => a[0] - b[0])
                      .map(([count, rate]) => (
                        <span key={count} className="rate-option">
                          {termLabel(rate)} <strong>{count}</strong> Taksit
                        </span>
                      ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
