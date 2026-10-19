"use client";

import { useEffect, useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";
import { SpinnerIcon } from "@components/b2b-theme/icons";
import { PaymentForm } from "@components/b2b-theme/payment-form";
import { InstallmentForm } from "@components/b2b-theme/installment-form";
import { InstallmentRatesTable } from "@components/b2b-theme/installment-rates-table";

interface BankAccount { _id: string; name?: string; accountName?: string; iban?: string; }

function formatIban(iban: string): string {
  return (iban || "").replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

function maskAmount(raw: string): string {
  let v = (raw || "").replace(/[^\d,]/g, "");
  const firstComma = v.indexOf(",");
  if (firstComma !== -1) {
    v = v.slice(0, firstComma + 1) + v.slice(firstComma + 1).replace(/,/g, "");
  }
  const parts = v.split(",");
  let intPart = parts[0].replace(/^0+(?=\d)/, "");
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (parts.length > 1) {
    if (intPart === "") intPart = "0";
    return `${intPart},${parts[1].slice(0, 2)}`;
  }
  return intPart;
}

function parseAmountToKurus(text: string): number {
  const t = (text || "").trim().replace(/\./g, "").replace(",", ".");
  if (!t) return 0;
  const v = Number(t);
  if (!isFinite(v) || v <= 0) return 0;
  return Math.round(v * 100);
}

export default function OdemePage() {
  const [amount, setAmount] = useState("");
  const [odemeTipi, setOdemeTipi] = useState<"pesin" | "taksitli">("pesin");
  const [banks, setBanks] = useState<BankAccount[] | null>(null);
  const [cardOpts, setCardOpts] = useState<{ tekCekim: boolean; taksit: boolean }>({ tekCekim: true, taksit: true });

  useEffect(() => {
    fetch(API_ENDPOINTS.payment.bankAccounts(), { headers: { "X-Site": "b2b" } }).then((r) => r.json())
      .then((d) => { const arr = d?.data || d?.accounts || d; setBanks(Array.isArray(arr) ? arr : []); }).catch(() => setBanks([]));
    fetch(API_ENDPOINTS.payment.creditCardOptions(), { headers: { "X-Site": "b2b" } }).then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data) {
          const o = { tekCekim: d.data.tekCekim !== false, taksit: d.data.taksit !== false };
          setCardOpts(o);
          setOdemeTipi(o.tekCekim ? "pesin" : (o.taksit ? "taksitli" : "pesin"));
        }
      }).catch(() => {});
  }, []);

  const amountKurus = parseAmountToKurus(amount);
  const anyCard = cardOpts.tekCekim || cardOpts.taksit;
  const effTip: "pesin" | "taksitli" =
    cardOpts.tekCekim && (odemeTipi === "pesin" || !cardOpts.taksit) ? "pesin" : "taksitli";

  return (
    <div className="pay-col8">
      <div className="page-head"><div><h1>Ödeme Yap</h1></div></div>

      <div className="pay-top">
        <div className="pay-form pay-form-wide">
          <label htmlFor="pay-amount">Ödeme Tutarı (TL)</label>
          <div className="pay-amount-row">
            <input
              id="pay-amount" type="text" inputMode="decimal" placeholder="0,00"
              value={amount} onChange={(e) => setAmount(maskAmount(e.target.value))}
            />
            {cardOpts.tekCekim && cardOpts.taksit ? (
              <select
                className="pay-select" aria-label="Ödeme tipi" value={effTip}
                onChange={(e) => setOdemeTipi(e.target.value as "pesin" | "taksitli")}
              >
                <option value="pesin">Peşin</option>
                <option value="taksitli">Taksitli</option>
              </select>
            ) : null}
          </div>
        </div>
      </div>

      <hr className="pay-divider" />

      {!anyCard ? (
        <div className="pm-inline">
          <p className="pay-notice info" style={{ margin: 0 }}>
            Kredi kartı ile ödeme şu an kapalıdır. Aşağıdaki banka hesaplarımıza havale/EFT ile ödeyebilirsiniz.
          </p>
        </div>
      ) : effTip === "pesin" ? (
        <PaymentForm amountKurus={amountKurus} />
      ) : (
        <InstallmentForm amountKurus={amountKurus} />
      )}

      {anyCard && effTip === "taksitli" ? <InstallmentRatesTable /> : null}

      {anyCard ? null : (
        <>
          <hr className="pay-divider" />
          <h2 className="section">Banka Hesapları</h2>
          {banks === null ? (
            <p className="note loading-row" style={{ padding: "0.6rem 0" }}>
              <SpinnerIcon size={16} className="loading-brand" /> Banka hesapları yükleniyor…
            </p>
          ) : banks.length === 0 ? (
            <p className="note">Tanımlı banka hesabı bulunmuyor.</p>
          ) : (
            <div className="tablewrap">
              <table className="data order-table bank-table">
                <thead>
                  <tr>
                    <th>Banka</th>
                    <th>Hesap Sahibi</th>
                    <th>IBAN</th>
                  </tr>
                </thead>
                <tbody>
                  {banks.map((b) => (
                    <tr key={b._id}>
                      <td><strong className="bank-name">{b.name || "—"}</strong></td>
                      <td>{b.accountName || "—"}</td>
                      <td><code className="bank-iban">{b.iban ? formatIban(b.iban) : "—"}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
