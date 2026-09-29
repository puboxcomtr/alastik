"use client";

// Tek Çekim (Peşin) kart formu — sayfada varsayılan açık blok (başlık/önizleme/vazgeç yok).
// Tutar üstteki "Ödeme Tutarı" alanından canlı gelir. Kart bilgisi TARAYICIDA
// paynet-custom.js ile token'lanır; sunucuya gitmez.
// Akış: /tekcekim/baslat → Paynet Özelleştirilmiş Form → 3D → /tekcekim/return → /odeme-sonuc.
import { useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";
import { CardIcon, SpinnerIcon } from "./icons";

const nf = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyTL = (kurus: number) => `${nf.format((kurus || 0) / 100)} TL`;

function onlyDigits(s: string): string { return (s || "").replace(/\D/g, ""); }
function groupCard(digits: string): string { return digits.replace(/(.{4})/g, "$1 ").trim(); }

// Luhn algoritması — kart numarası bütünlük kontrolü.
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

interface StartData {
  paymentId: string;
  pt: string;
  reference: string;
  amountKurus: number;
  config: { publishableKey: string; jsUrl: string };
}

// Paynet SDK onAuthentication sonucu (başarısızlıkta ok:false + mesaj alanları).
interface PaynetAuthResult {
  ok?: boolean;
  message?: string;
  error_message?: string;
  md_error_message?: string;
  errorMessage?: string;
}

export function PaymentForm({ amountKurus }: { amountKurus: number }) {
  const [num, setNum] = useState("");
  const [holder, setHolder] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const setCard = (v: string) => setNum(groupCard(onlyDigits(v).slice(0, 16)));
  const setExpiry = (v: string) => {
    const d = onlyDigits(v).slice(0, 4);
    setExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
  };
  const setName = (v: string) => setHolder(v.replace(/[^a-zA-ZÀ-ſ\s]/g, ""));

  // Paynet Özelleştirilmiş Form'u kur ve tokenizasyonu tetikle (kart → doğrudan Paynet).
  function startPaynet(d: StartData) {
    document.getElementById("paynet-host")?.remove();
    const host = document.createElement("div");
    host.id = "paynet-host";
    host.style.display = "none";
    document.body.appendChild(host);

    const form = document.createElement("form");
    form.id = "paynet-form";
    form.method = "post";
    form.action = API_ENDPOINTS.b2b.tekCekimReturn();

    const hidden = (name: string, value: string) => {
      const i = document.createElement("input");
      i.type = "hidden"; i.name = name; i.value = value; form.appendChild(i);
    };
    hidden("paymentId", d.paymentId);
    hidden("pt", d.pt);
    hidden("returnOrigin", window.location.origin);

    const [mm, yy] = exp.split("/");
    const pinput = (attr: string, value: string) => {
      const i = document.createElement("input");
      i.setAttribute("data-paynet", attr); i.type = "hidden"; i.value = value; form.appendChild(i);
    };
    pinput("holderName", holder.trim());
    pinput("number", onlyDigits(num));
    pinput("exp-month", String(parseInt(mm || "0", 10)));
    pinput("exp-year", `20${(yy || "").padStart(2, "0")}`);
    pinput("cvv", cvv);

    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.setAttribute("data-paynet", "submit");
    submitBtn.textContent = "Öde";
    form.appendChild(submitBtn);
    host.appendChild(form);

    const s = document.createElement("script");
    s.type = "text/javascript";
    s.className = "paynet-button";
    s.src = d.config.jsUrl;
    s.setAttribute("data-form", "#paynet-form");
    s.setAttribute("data-key", d.config.publishableKey);
    // data-amount = TR formatlı TL (virgül ondalık); SDK ×100 ile kuruşa çevirir.
    s.setAttribute("data-amount", (d.amountKurus / 100).toFixed(2).replace(".", ","));
    s.setAttribute("data-reference_no", d.reference);
    s.setAttribute("data-tds_required", "true");
    s.setAttribute("data-no_instalment", "true");
    s.setAttribute("data-transaction_type", "1");
    // Paynet'in kendi 3D hata POPUP'ını kapat — hatayı biz form başında göstereceğiz.
    s.setAttribute("data-show_tds_error", "false");
    s.onload = () => {
      // SDK global'i (window.Paynet) üzerinden 3D sonucunu yakala; başarısızlıkta
      // hatayı formun başında göster (popup yerine).
      try {
        const P = (window as unknown as { Paynet?: { events?: { onAuthentication?: (fn: (res: PaynetAuthResult) => void) => void } } }).Paynet;
        P?.events?.onAuthentication?.((res) => {
          if (res && res.ok === false) {
            const msg = res.message || res.error_message || res.md_error_message || res.errorMessage
              || "Ödemeniz bankanız tarafından reddedildi. Lütfen kart bilgilerinizi kontrol edip tekrar deneyiniz.";
            setErr(String(msg));
            setBusy(false);
          }
        });
      } catch { /* hook kurulamazsa sessiz geç */ }
      window.setTimeout(() => submitBtn.click(), 400);
    };
    s.onerror = () => { setErr("Ödeme altyapısı yüklenemedi, tekrar deneyin."); setBusy(false); };
    host.appendChild(s);
  }

  const submit = async () => {
    if (!(amountKurus > 0)) { setErr("Lütfen ödeme tutarını giriniz."); return; }
    if (!luhnOk(onlyDigits(num))) { setErr("Kart numarası geçersiz. Lütfen kontrol ediniz."); return; }
    if (!holder.trim()) { setErr("Kart üzerindeki ismi giriniz."); return; }
    if (!expiryValid(exp)) { setErr("Son kullanma tarihi geçersiz."); return; }
    if (cvv.length < 3) { setErr("Güvenlik kodunu (CVV) giriniz."); return; }
    setErr("");
    setBusy(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      const res = await fetch(API_ENDPOINTS.b2b.tekCekimBaslat(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Site": "b2b" },
        body: JSON.stringify({ amount: amountKurus / 100 }),
      });
      const data = await res.json();
      if (!data?.success || !data.data?.config?.publishableKey) {
        setErr(data?.message || "Ödeme başlatılamadı, lütfen tekrar deneyin.");
        setBusy(false);
        return;
      }
      // SDK tokenizasyon + 3D yönlendirmesini yapar; sayfa /odeme-sonuc'a döner.
      startPaynet(data.data as StartData);
    } catch {
      setErr("Ödeme başlatılamadı, lütfen tekrar deneyin.");
      setBusy(false);
    }
  };

  return (
    <div className="pm-inline" role="region" aria-label="Tek çekim ödeme">
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

        <button type="button" className="btn-pay pm-full" onClick={submit} disabled={busy}>
          {busy
            ? (<><SpinnerIcon size={17} /> Yönlendiriliyor…</>)
            : (<><CardIcon size={17} /> {amountKurus > 0 ? `${moneyTL(amountKurus)} ` : ""}Öde</>)}
        </button>
        <p className="pm-secure"><CardIcon size={13} /> 3D Secure ile güvenli ödeme. Kart bilgileriniz saklanmaz.</p>
      </div>
    </div>
  );
}
