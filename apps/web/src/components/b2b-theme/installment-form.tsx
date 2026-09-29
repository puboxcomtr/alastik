"use client";

// Taksitli (NetTahsilat PirPos) kart formu — cari borç için. Kart numarasının ilk
// 6 hanesinden (BIN) + tutardan taksit seçenekleri çekilir; seçim + kart bilgisiyle
// 3D başlatılır. Kart sunucuya gelir → PirPos'a iletilir (saklanmaz).
// Akış: /netahsilat/ratios → /netahsilat/borc-init → 3D → /netahsilat/borc-callback → /odeme-sonuc.
import { useEffect, useMemo, useRef, useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";
import { CardIcon, SpinnerIcon } from "./icons";

const nf = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tl = (v: number) => `${nf.format(v || 0)} TL`;

function onlyDigits(s: string): string { return (s || "").replace(/\D/g, ""); }
function groupCard(digits: string): string { return digits.replace(/(.{4})/g, "$1 ").trim(); }

function luhnOk(digits: string): boolean {
  if (digits.length < 15) return false;
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

function expiryValid(mmYY: string): boolean {
  const d = onlyDigits(mmYY);
  if (d.length !== 4) return false;
  const mm = Number(d.slice(0, 2));
  const yy = Number(d.slice(2, 4));
  if (mm < 1 || mm > 12) return false;
  const now = new Date();
  const curYY = now.getFullYear() % 100;
  const curMM = now.getMonth() + 1;
  if (yy < curYY || (yy === curYY && mm < curMM)) return false;
  return true;
}

interface TaksitOption {
  instalment: number;
  desc: string;
  instalmentAmount: number;
  totalAmount: number;
  commission: number;
  vPosId: number;
}

export function InstallmentForm({ amountKurus }: { amountKurus: number }) {
  const [num, setNum] = useState("");
  const [holder, setHolder] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [options, setOptions] = useState<TaksitOption[] | null>(null);
  const [loadingRatios, setLoadingRatios] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const lastKey = useRef("");

  const digits = useMemo(() => onlyDigits(num), [num]);
  const bin = digits.slice(0, 6);

  const setCard = (v: string) => setNum(groupCard(onlyDigits(v).slice(0, 16)));
  const setExpiry = (v: string) => {
    const d = onlyDigits(v).slice(0, 4);
    setExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
  };
  const setName = (v: string) => setHolder(v.replace(/[^a-zA-ZÀ-ſ\s]/g, ""));

  // BIN (ilk 6) + tutar hazır olunca taksit seçeneklerini çek.
  useEffect(() => {
    if (bin.length < 6 || !(amountKurus > 0)) { setOptions(null); setSelected(null); return; }
    const key = `${bin}:${amountKurus}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    setLoadingRatios(true);
    setOptions(null);
    setSelected(null);
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    const t = window.setTimeout(() => {
      fetch(API_ENDPOINTS.b2b.taksitRatios(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Site": "b2b" },
        body: JSON.stringify({ amount: amountKurus / 100, bin }),
      })
        .then((r) => r.json())
        .then((d) => {
          const opts: TaksitOption[] = d?.data?.options || [];
          setOptions(opts);
          if (opts.length) setSelected(opts[0].instalment);
        })
        .catch(() => setOptions([]))
        .finally(() => setLoadingRatios(false));
    }, 350);
    return () => window.clearTimeout(t);
  }, [bin, amountKurus]);

  const submit = async () => {
    if (!(amountKurus > 0)) { setErr("Lütfen ödeme tutarını giriniz."); return; }
    if (!luhnOk(digits)) { setErr("Kart numarası geçersiz. Lütfen kontrol ediniz."); return; }
    if (!holder.trim()) { setErr("Kart üzerindeki ismi giriniz."); return; }
    if (!expiryValid(exp)) { setErr("Son kullanma tarihi geçersiz."); return; }
    if (cvv.length < 3) { setErr("Güvenlik kodunu (CVV) giriniz."); return; }
    const opt = (options || []).find((o) => o.instalment === selected);
    if (!opt) { setErr("Lütfen bir taksit seçeneği seçiniz."); return; }
    setErr("");
    setBusy(true);
    try {
      const [mm, yy] = exp.split("/");
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      const res = await fetch(API_ENDPOINTS.b2b.borcTaksitInit(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Site": "b2b" },
        body: JSON.stringify({
          amount: amountKurus / 100,
          cardNumber: digits,
          cardHolderName: holder.trim(),
          expMonth: String(parseInt(mm || "0", 10)),
          expYear: `20${(yy || "").padStart(2, "0")}`,
          cvc: cvv,
          installment: opt.instalment,
          vPosId: opt.vPosId,
          returnOrigin: window.location.origin,
        }),
      });
      const data = await res.json();
      if (data?.success && data.threeDUrl) {
        // 3D sayfasına yönlen; banka onayından sonra /odeme-sonuc'a döner.
        window.location.href = data.threeDUrl;
        return;
      }
      setErr(data?.message || "Ödeme başlatılamadı, lütfen tekrar deneyin.");
      setBusy(false);
    } catch {
      setErr("Ödeme başlatılamadı, lütfen tekrar deneyin.");
      setBusy(false);
    }
  };

  return (
    <div className="pm-inline" role="region" aria-label="Taksitli ödeme">
      <div className="pm-form">
        {err ? <p className="pm-err pm-err-top">{err}</p> : null}
        <label className="pm-field">
          <span>Kart Numarası</span>
          <input type="text" inputMode="numeric" placeholder="Lütfen Kart Numaranızı Giriniz" disabled={busy}
            value={num} onChange={(e) => setCard(e.target.value)} autoComplete="cc-number" />
        </label>
        <label className="pm-field">
          <span>Kart Üzerindeki İsim</span>
          <input type="text" placeholder="Adınızı Soyadınızı Giriniz" value={holder} disabled={busy}
            onChange={(e) => setName(e.target.value)} autoComplete="cc-name" />
        </label>
        <div className="pm-row2">
          <label className="pm-field">
            <span>Son Kullanma Tarihi</span>
            <input type="text" inputMode="numeric" placeholder="AA/YY" value={exp} disabled={busy}
              onChange={(e) => setExpiry(e.target.value)} autoComplete="cc-exp" />
          </label>
          <label className="pm-field">
            <span>CVV</span>
            <input type="text" inputMode="numeric" placeholder="123" value={cvv} disabled={busy}
              onChange={(e) => setCvv(onlyDigits(e.target.value).slice(0, 4))} autoComplete="cc-csc" />
          </label>
        </div>

        {/* Taksit seçenekleri (BIN + tutardan) */}
        <div className="taksit-box">
          <div className="taksit-title">Taksit Seçenekleri</div>
          {!(amountKurus > 0) ? (
            <p className="taksit-hint">Önce ödeme tutarını giriniz.</p>
          ) : bin.length < 6 ? (
            <p className="taksit-hint">Taksit seçenekleri için kart numaranızı giriniz.</p>
          ) : loadingRatios ? (
            <p className="taksit-hint loading-row"><SpinnerIcon size={15} className="loading-brand" /> Taksit seçenekleri yükleniyor…</p>
          ) : options && options.length ? (
            <div className="taksit-list">
              {options.map((o) => (
                <label key={o.instalment} className={`taksit-opt${selected === o.instalment ? " active" : ""}`}>
                  <input type="radio" name="taksit" checked={selected === o.instalment}
                    onChange={() => setSelected(o.instalment)} disabled={busy} />
                  <span className="taksit-count">{o.instalment} Taksit</span>
                  <span className="taksit-monthly">Aylık {tl(o.instalmentAmount)}</span>
                  <span className="taksit-total">Toplam {tl(o.totalAmount)}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="taksit-hint">Bu kart için taksit seçeneği bulunamadı. Peşin ödemeyi kullanabilirsiniz.</p>
          )}
        </div>

        <button type="button" className="btn-pay pm-full" onClick={submit} disabled={busy || !(options && options.length)}>
          {busy
            ? (<><SpinnerIcon size={17} /> Yönlendiriliyor…</>)
            : (<><CardIcon size={17} /> {amountKurus > 0 ? `${tl(amountKurus / 100)} ` : ""}Taksitli Öde</>)}
        </button>
        <p className="pm-secure"><CardIcon size={13} /> 3D Secure ile güvenli ödeme. Kart bilgileriniz saklanmaz.</p>
      </div>
    </div>
  );
}
