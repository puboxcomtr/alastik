"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeftIcon, SeasonIcon, TrashIcon } from "@components/b2b-theme/icons";
import { useCart } from "@components/b2b-theme/cart-status";
import { showToast } from "@components/b2b-theme/toast";
import { formatKurus } from "@components/b2b-theme/lib/format";
import { AnimatedMoney } from "@components/b2b-theme/animated-money";
import { DeliveryAddress } from "@components/b2b-theme/delivery-address";
import { REMAINING_LIMIT_KURUS } from "@components/b2b-theme/lib/sample-data";
import { API_ENDPOINTS } from "@src/config/api";
import {
  B2bPricing,
  computeDiscountedTotals,
  lineDiscountPct,
} from "@components/b2b-theme/lib/payment-pricing";

// Teslimat yöntemleri (sepette gösterim sırası). id = sipariş/işlem anahtarı.
// "Şubeden Gel Al" (gelAl) DIA Gel-Al kampanyasının ek iskontosunu getirir.
const DELIVERY_METHODS = [
  { id: "standartSevkiyat", title: "Standart Sevkiyat" },
  { id: "gelAl", title: "Şubeden Gel Al" },
  { id: "kargo", title: "Kargo ile Sevkiyat" },
];

// IBAN'ı 4'erli gruplara ayırarak okunur gösterir (TR31 0001 0011 ...).
function formatIban(iban: string): string {
  return (iban || "")
    .replace(/\s+/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

// Kredi kartı alan biçimlendirme (numara 4'lü grup, son kullanma AA/YY).
// Ham kart verisi yalnız istemcide tutulur; tahsilat sanal POS akışında yapılır.
function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

type BankAccount = {
  _id: string;
  name?: string;
  accountName?: string;
  iban?: string;
  processingTime?: string;
};

export default function SepetPage() {
  const sepet = useCart();
  const router = useRouter();
  const [pricing, setPricing] = useState<B2bPricing | null>(null);
  const [paymentId, setPaymentId] = useState("");
  const [deliveryId, setDeliveryId] = useState(DELIVERY_METHODS[0].id);
  // Seçili teslimat adresinin ili — "Şubeden Gel Al" yalnız İstanbul'da açık.
  const [teslimatIl, setTeslimatIl] = useState("");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Kredi kartı formu (Kredi Kartı — Tek Çekim seçilince görünür)
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  // Paynet frontend yapılandırması (publishableKey/jsUrl) — kart seçilince çekilir.
  // null = henüz yüklenmedi, false = bu cari/site için kullanılamıyor.
  const [paynetCfg, setPaynetCfg] = useState<
    { publishableKey: string; jsUrl: string; apiUrl: string; mode: string } | null | false
  >(null);
  // Kredi Kartı — Taksit (NetTahsilat PirPos; 3D submit backend fazında bağlanır).
  // Taksit seçenekleri kart BIN'inden çekilir. "loading" = sorgulanıyor.
  const [taksitOps, setTaksitOps] = useState<
    { instalment: number; desc: string; instalmentAmount: number; totalAmount: number; vPosId: number }[]
    | null
    | "loading"
  >(null);
  const [secilenTaksit, setSecilenTaksit] = useState(0); // 0 = henüz seçilmedi

  // Ödeme sonucu (3D dönüşünde ?odeme=basarili|basarisiz ile gelinir)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const odeme = q.get("odeme");
    if (!odeme) return;
    if (odeme === "basarili") {
      showToast("Ödemeniz alındı, siparişiniz oluşturuldu.", "ok");
      sepet.clear();
      router.replace("/siparisler");
    } else if (odeme === "basarisiz") {
      showToast(q.get("mesaj") || "Ödeme tamamlanamadı.", "hata");
      router.replace("/sepet");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kredi Kartı — Tek Çekim seçilince Paynet yapılandırmasını çek (secret dönmez)
  useEffect(() => {
    if (paymentId !== "kkTek") return;
    if (paynetCfg) return; // zaten yüklü
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    if (!token) return;
    fetch(API_ENDPOINTS.b2b.paynetConfig(), {
      headers: { Authorization: `Bearer ${token}`, "X-Site": "b2b" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => setPaynetCfg(res?.success && res.data ? res.data : false))
      .catch(() => setPaynetCfg(false));
  }, [paymentId, paynetCfg]);

  // Paynet Özelleştirilmiş Form'u kur ve tokenizasyonu tetikle.
  // Kart bilgisi bu form üzerinden DOĞRUDAN Paynet'e gider; sunucumuza gelmez.
  // paynet-custom.js kartı token'lar, 3D yönlendirmesini yapar ve form'u
  // session_id/token_id ile action'a (paynet/return) POST eder.
  function startPaynet(
    order: { orderId: string; orderNumber: string; total: number; paymentToken: string },
    cfg: { publishableKey: string; jsUrl: string }
  ) {
    document.getElementById("paynet-host")?.remove();
    const host = document.createElement("div");
    host.id = "paynet-host";
    host.style.display = "none";
    document.body.appendChild(host);

    const form = document.createElement("form");
    form.id = "paynet-form";
    form.method = "post";
    form.action = API_ENDPOINTS.b2b.paynetReturn();

    const hidden = (name: string, value: string) => {
      const i = document.createElement("input");
      i.type = "hidden";
      i.name = name;
      i.value = value;
      form.appendChild(i);
    };
    hidden("orderId", order.orderId);
    hidden("pt", order.paymentToken);
    hidden("returnOrigin", window.location.origin);

    // Kart alanları — Paynet SDK data-paynet ile DOM'dan okur
    const [mm, yy] = card.expiry.split("/");
    const paynetInput = (attr: string, value: string) => {
      const i = document.createElement("input");
      i.setAttribute("data-paynet", attr);
      i.type = "hidden";
      i.value = value;
      form.appendChild(i);
    };
    paynetInput("holderName", card.name.trim());
    paynetInput("number", card.number.replace(/\D/g, ""));
    paynetInput("exp-month", String(parseInt(mm || "0", 10)));
    paynetInput("exp-year", `20${(yy || "").padStart(2, "0")}`);
    paynetInput("cvv", card.cvv.replace(/\D/g, ""));

    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.setAttribute("data-paynet", "submit");
    submitBtn.textContent = "Öde";
    form.appendChild(submitBtn);
    host.appendChild(form);

    const s = document.createElement("script");
    s.type = "text/javascript";
    s.className = "paynet-button";
    s.src = cfg.jsUrl;
    s.setAttribute("data-form", "#paynet-form");
    s.setAttribute("data-key", cfg.publishableKey);
    // paynet-custom.js data-amount = TR formatlı TL (virgül ondalık): SDK
    // parseFormattedFloat ile noktayı binlik ayracı sayıp SİLER, virgülü ondalık
    // alır. Bu yüzden "237,50" göndeririz (nokta ile "237.50" → 23750'e bozulur).
    s.setAttribute("data-amount", Number(order.total).toFixed(2).replace(".", ",")); // TL, ör. "237,50"
    s.setAttribute("data-reference_no", order.orderNumber);
    s.setAttribute("data-tds_required", "true");
    // Tek Çekim: token da no_instalment=true ile oluşsun ki sunucudaki charge
    // (no_instalment:true) ile birebir eşleşsin (yoksa "no_instalment uyuşmuyor").
    s.setAttribute("data-no_instalment", "true");
    // charge transaction_type:'1' (Satış) gönderiyor; token da aynı olsun.
    s.setAttribute("data-transaction_type", "1");
    s.onload = () => {
      // SDK forma bağlandıktan sonra tokenizasyonu tetikle
      window.setTimeout(() => submitBtn.click(), 400);
    };
    s.onerror = () => {
      showToast("Ödeme altyapısı yüklenemedi, tekrar deneyin.", "hata");
      setSubmitting(false);
    };
    host.appendChild(s);
  }

  // Siparişi oluştur → sunucuda WebOrder (kredi kartında DIA ödeme sonrası)
  // Taksitli ödeme (NetTahsilat PirPos): kart + seçilen taksit ile 3D başlatır,
  // dönen bankanın 3D sayfasına yönlendirir. Kart yalnız bu adımda sunucuya gider.
  async function taksitOde(order: { orderId: string; paymentToken: string }) {
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    const secilen = Array.isArray(taksitOps)
      ? taksitOps.find((o) => o.instalment === secilenTaksit)
      : null;
    if (!token || !secilen) {
      showToast("Taksit seçeneği bulunamadı, tekrar deneyin.", "hata");
      setSubmitting(false);
      return;
    }
    const [ay, yil] = card.expiry.split("/");
    try {
      const res = await fetch(API_ENDPOINTS.b2b.taksitInit(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Site": "b2b" },
        body: JSON.stringify({
          orderId: order.orderId,
          pt: order.paymentToken,
          cardNumber: card.number.replace(/\s/g, ""),
          cardHolderName: card.name.trim(),
          expMonth: ay,
          expYear: yil,
          cvc: card.cvv,
          installment: secilen.instalment,
          vPosId: secilen.vPosId,
          returnOrigin: window.location.origin,
        }),
      }).then((r) => r.json());
      if (res?.success && res.threeDUrl) {
        window.location.href = res.threeDUrl; // bankanın 3D Secure sayfası
        return;
      }
      showToast(res?.message || "Taksitli ödeme başlatılamadı.", "hata");
      setSubmitting(false);
    } catch {
      showToast("Taksitli ödeme başlatılamadı.", "hata");
      setSubmitting(false);
    }
  }

  async function siparisVer() {
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    if (!token) {
      showToast("Oturum bulunamadı, tekrar giriş yapın.", "hata");
      return;
    }
    if (sepet.lines.length === 0 || submitting) return;
    // Taksitli ödeme (NetTahsilat PirPos): kart + taksit seçimi zorunlu.
    if (taksitOdeme) {
      if (!kartGecerli) {
        showToast("Lütfen kart bilgilerini eksiksiz girin.", "hata");
        return;
      }
      if (!secilenTaksit) {
        showToast("Lütfen bir taksit seçeneği seçin.", "hata");
        return;
      }
    }
    if (kartOdeme && !paynetCfg) {
      showToast("Kredi kartı ödemesi şu anda kullanılamıyor.", "hata");
      return;
    }
    setSubmitting(true);
    try {
      const items = sepet.lines.map(s => ({ stockCode: s.urun.stockCode, quantity: s.adet }));
      const res = await fetch(API_ENDPOINTS.b2b.siparis(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Site": "b2b"
        },
        body: JSON.stringify({ items, paymentMethod: paymentId, deliveryMethod: deliveryId })
      }).then(r => r.json());
      if (!res?.success || !res.data) {
        showToast(res?.message || "Sipariş oluşturulamadı.", "hata");
        setSubmitting(false);
        return;
      }
      // Kredi kartı: 3D akışını başlat (submitting açık kalır — sayfa yönlenecek)
      if (res.data.requiresPayment) {
        // Sonuç sayfası yalnız bu akıştan gelene açılsın diye işaret bırak (3D
        // dönüşünde aynı sekmede sessionStorage korunur).
        try {
          sessionStorage.setItem("b2bOdemeAkisi", String(res.data.orderNumber || "1"));
        } catch {
          /* sessionStorage kapalı olabilir — sonuç sayfası fail-open davranır */
        }
        if (taksitOdeme) {
          await taksitOde(res.data); // NetTahsilat PirPos (taksitli)
        } else {
          startPaynet(res.data, paynetCfg as { publishableKey: string; jsUrl: string }); // Paynet (tek çekim)
        }
        return;
      }
      // Cari / Havale: sipariş oluştu
      showToast("Siparişiniz oluşturuldu.", "ok");
      sepet.clear();
      router.push("/siparisler");
    } catch {
      showToast("Sipariş oluşturulamadı.", "hata");
      setSubmitting(false);
    }
  }

  // Banka hesapları (havale ile ödeme seçilince gösterilir) — site bazlı (b2b)
  useEffect(() => {
    fetch(API_ENDPOINTS.payment.bankAccounts(), { headers: { "X-Site": "b2b" } })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) setBankAccounts(res.data);
      })
      .catch(() => {});
  }, []);

  // Ödeme yöntemleri + marka bazlı iskonto haritası (carinin segmentine göre)
  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    if (!t) return;
    fetch(API_ENDPOINTS.b2b.odemeYontemleri(), {
      headers: { Authorization: `Bearer ${t}`, "X-Site": "b2b" },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && res.data) {
          setPricing(res.data);
          setPaymentId((prev) => prev || res.data.methods?.[0]?.id || "");
        }
      })
      .catch(() => {});
  }, []);

  const gelAlSecili = deliveryId === "gelAl";
  // "Şubeden Gel Al" yalnız teslimat adresi İstanbul olduğunda kullanılabilir.
  // İ/I/ı hepsi "i"ye indirgenip karşılaştırılır (İSTANBUL/İstanbul/istanbul tümü eşleşir).
  const istanbulTeslimat =
    teslimatIl.trim().replace(/[İIı]/g, "i").toLowerCase() === "istanbul";
  const gelAlBonus = gelAlSecili ? pricing?.gelAlBonus ?? 0 : 0;
  const totals = computeDiscountedTotals(sepet.lines, pricing, paymentId, gelAlSecili);
  const limitExceeded = totals.totalKurus > REMAINING_LIMIT_KURUS;

  // Kredi Kartı — Tek Çekim seçiliyse kart formunun eksiksiz doldurulması gerekir
  const kartOdeme = paymentId === "kkTek";
  const kartGecerli =
    card.number.replace(/\D/g, "").length >= 15 &&
    card.name.trim().length >= 3 &&
    /^\d{2}\/\d{2}$/.test(card.expiry) &&
    card.cvv.replace(/\D/g, "").length >= 3;

  // Kredi Kartı — Taksit (NetTahsilat). Kartın ilk 6 hanesi (BIN) taksit
  // oranlarını belirler; tam kart numarası ratios sorgusuna GÖNDERİLMEZ.
  const taksitOdeme = paymentId === "kkTaksit";
  const kartBin = card.number.replace(/\D/g, "").slice(0, 6);

  // Sepet boşsa (localStorage okunduktan sonra) "sepetiniz boş" gösterme,
  // doğrudan anasayfaya yönlendir.
  useEffect(() => {
    // Sipariş verilirken sepet KASITLI temizlenir (siparisVer /siparisler'e
    // yönlendirir); o an anasayfaya atma. Yalnız gerçekten boş sepette çalış.
    if (!submitting && sepet.hydrated && sepet.lines.length === 0) {
      router.replace("/");
    }
  }, [submitting, sepet.hydrated, sepet.lines.length, router]);

  // Teslimat adresi İstanbul değilken Gel Al seçili kalmışsa standart sevkiyata düş.
  useEffect(() => {
    if (deliveryId === "gelAl" && !istanbulTeslimat) {
      setDeliveryId(DELIVERY_METHODS[0].id);
    }
  }, [istanbulTeslimat, deliveryId]);

  // Taksit: kart BIN'i (ilk 6) girilince sepet tutarına göre taksit oranlarını çek.
  useEffect(() => {
    if (!taksitOdeme) {
      setTaksitOps(null);
      setSecilenTaksit(0);
      return;
    }
    if (kartBin.length < 6) {
      setTaksitOps(null);
      return;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    const amountTL = totals.totalKurus / 100;
    if (!token || !(amountTL > 0)) return;
    setTaksitOps("loading");
    const ctrl = new AbortController();
    fetch(API_ENDPOINTS.b2b.taksitRatios(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Site": "b2b" },
      body: JSON.stringify({ amount: amountTL, bin: kartBin }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((res) => {
        const ops = res?.success && Array.isArray(res.data?.options) ? res.data.options : [];
        setTaksitOps(ops);
        // İlk (en düşük) taksit seçeneği otomatik seçili gelsin.
        setSecilenTaksit(ops[0]?.instalment || 0);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setTaksitOps([]);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taksitOdeme, kartBin, totals.totalKurus]);

  // Yükleniyor ya da boş (yönlendirme çalışıyor): içerik çizme, boş mesajı gösterme.
  if (!sepet.hydrated || sepet.lines.length === 0) {
    return null;
  }

  return (
    <>
      <div className="page-head" style={{ justifyContent: "flex-end" }}>
        <Link className="btn-ghost" href="/">
          <ArrowLeftIcon size={15} /> Alışverişe devam
        </Link>
      </div>


      {sepet.lines.length === 0 ? null : (
        <div className="cart-layout">
          {/* SOL: teslimat adresi + ödeme yöntemi */}
          <div className="cart-left">
            {/* Şubeden Gel Al'da teslimat adresi sorulmaz (üründen şubede teslim) */}
            {!gelAlSecili ? (
              <DeliveryAddress onSelectedChange={(a) => setTeslimatIl(a?.il || "")} />
            ) : null}

            <div className="cart-card payment-method-card">
              <h2 className="cart-card-title">Ödeme Yöntemi</h2>
              {pricing && pricing.methods.length > 0 ? (
                <div className="payment-grid">
                  {pricing.methods.map((m) => {
                    const secili = m.id === paymentId;
                    return (
                      <label
                        key={m.id}
                        className={`payment-option${secili ? " secili" : ""}`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={secili}
                          onChange={() => setPaymentId(m.id)}
                        />
                        <span className="po-radio" aria-hidden="true" />
                        <span className="po-title">{m.title}</span>
                        {m.discountPct > 0 ? (
                          <span className="po-discount">%{m.discountPct} İskonto</span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="note" style={{ padding: "0.6rem 0" }}>
                  {pricing ? "Bu cari için tanımlı ödeme yöntemi bulunamadı." : "Ödeme yöntemleri yükleniyor…"}
                </p>
              )}
            </div>

            {paymentId === "havale" ? (
              <div className="cart-card bank-accounts-card">
                <h2 className="cart-card-title">Banka Hesap Bilgilerimiz</h2>
                {bankAccounts.length > 0 ? (
                  <div className="bank-list">
                    {bankAccounts.map((b) => (
                      <div className="bank-item" key={b._id}>
                        <div className="bank-item-head">
                          <strong className="bank-name">{b.name}</strong>
                          {b.accountName ? (
                            <span className="bank-holder">{b.accountName}</span>
                          ) : null}
                        </div>
                        {b.iban ? (
                          <div className="bank-iban-row">
                            <code className="bank-iban">{formatIban(b.iban)}</code>
                            <button
                              type="button"
                              className="bank-copy"
                              onClick={() => {
                                navigator.clipboard
                                  ?.writeText(b.iban || "")
                                  .then(() => showToast("IBAN kopyalandı", "ok"))
                                  .catch(() => {});
                              }}
                            >
                              Kopyala
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="note" style={{ padding: "0.6rem 0" }}>
                    Tanımlı banka hesabı bulunamadı.
                  </p>
                )}
              </div>
            ) : null}

            {/* Kredi Kartı — Tek Çekim seçilince kart formu (havale deseniyle aynı) */}
            {kartOdeme ? (
              <div className="cart-card credit-card-card">
                <div className="cc-head">
                  <h2 className="cart-card-title cc-title">Kredi Kartı — Tek Çekim</h2>
                </div>

                <div className="cc-form">
                  <div className="cc-field">
                    <label htmlFor="ccNumber">Kart Numarası</label>
                    <input
                      id="ccNumber"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      maxLength={19}
                      placeholder="Lütfen Kart Numarası Giriniz"
                      value={card.number}
                      onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                    />
                  </div>
                  <div className="cc-field">
                    <label htmlFor="ccName">Kart Üzerindeki İsim</label>
                    <input
                      id="ccName"
                      autoComplete="cc-name"
                      placeholder="Lütfen İsim Soy isim giriniz"
                      value={card.name}
                      onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                    />
                  </div>
                  <div className="cc-grid2">
                    <div className="cc-field">
                      <label htmlFor="ccExp">Son Kullanma (AA/YY)</label>
                      <input
                        id="ccExp"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        maxLength={5}
                        placeholder="AA/YY"
                        value={card.expiry}
                        onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                      />
                    </div>
                    <div className="cc-field">
                      <label htmlFor="ccCvv">CVV</label>
                      <input
                        id="ccCvv"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        maxLength={4}
                        placeholder="123"
                        value={card.cvv}
                        onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                      />
                    </div>
                  </div>
                  <div className="cc-secure">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="4" y="11" width="16" height="9" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                    <span>
                      Kart bilgileriniz saklanmaz. Ödeme, bankanızın <strong>3D&nbsp;Secure</strong> ekranında tamamlanır.
                    </span>
                  </div>
                  {paynetCfg === false ? (
                    <div className="alert warn" style={{ marginTop: "0.6rem" }}>
                      Kredi kartı ödemesi şu anda kullanılamıyor. Lütfen başka bir ödeme yöntemi seçin.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Kredi Kartı — Taksit (NetTahsilat): kart formu + BIN'den taksit seçimi */}
            {taksitOdeme ? (
              <div className="cart-card credit-card-card">
                <div className="cc-head">
                  <h2 className="cart-card-title cc-title">Kredi Kartı — Taksitli</h2>
                </div>
                <div className="cc-form">
                  <div className="cc-field">
                    <label htmlFor="tkNumber">Kart Numarası</label>
                    <input
                      id="tkNumber"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      maxLength={19}
                      placeholder="Lütfen Kart Numarası Giriniz"
                      value={card.number}
                      onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                    />
                  </div>
                  <div className="cc-field">
                    <label htmlFor="tkName">Kart Üzerindeki İsim</label>
                    <input
                      id="tkName"
                      autoComplete="cc-name"
                      placeholder="Lütfen İsim Soy isim giriniz"
                      value={card.name}
                      onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                    />
                  </div>
                  <div className="cc-grid2">
                    <div className="cc-field">
                      <label htmlFor="tkExp">Son Kullanma (AA/YY)</label>
                      <input
                        id="tkExp"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        maxLength={5}
                        placeholder="AA/YY"
                        value={card.expiry}
                        onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                      />
                    </div>
                    <div className="cc-field">
                      <label htmlFor="tkCvv">CVV</label>
                      <input
                        id="tkCvv"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        maxLength={4}
                        placeholder="123"
                        value={card.cvv}
                        onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                      />
                    </div>
                  </div>

                  {/* Taksit seçenekleri — yalnız kart girildikten (BIN) sonra görünür */}
                  {kartBin.length >= 6 ? (
                  <div className="taksit-secim">
                    <div className="taksit-baslik">Taksit Seçenekleri</div>
                    {taksitOps === "loading" ? (
                      <p className="note taksit-ipucu">Taksit seçenekleri yükleniyor…</p>
                    ) : Array.isArray(taksitOps) && taksitOps.length > 0 ? (
                      <div className="taksit-list">
                        {taksitOps.map((o) => {
                          const secili = secilenTaksit === o.instalment;
                          const tekCekim = o.instalment <= 1;
                          return (
                            <label
                              key={o.instalment}
                              className={`taksit-option${secili ? " secili" : ""}`}
                            >
                              <input
                                type="radio"
                                name="taksit"
                                checked={secili}
                                onChange={() => setSecilenTaksit(o.instalment)}
                              />
                              <span className="tk-radio" />
                              <span className="tk-main">
                                <span className="tk-desc">
                                  {tekCekim ? "Tek Çekim" : `${o.instalment} Taksit`}
                                </span>
                                {!tekCekim ? (
                                  <span className="tk-sub">
                                    {formatKurus(Math.round(o.instalmentAmount * 100))} × {o.instalment} Taksit
                                  </span>
                                ) : null}
                              </span>
                              <span className="tk-total">
                                {formatKurus(Math.round(o.totalAmount * 100))}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="note taksit-ipucu">Bu kart için taksit seçeneği bulunamadı.</p>
                    )}
                  </div>
                  ) : null}

                  <div className="cc-secure">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="4" y="11" width="16" height="9" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                    <span>
                      Kart bilgileriniz saklanmaz. Ödeme, bankanızın <strong>3D&nbsp;Secure</strong> ekranında tamamlanır.
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* SAĞ: ürünler + sipariş özeti */}
          <aside className="cart-right">
            <div className="cart-card">
              <h2 className="cart-card-title">Sepetiniz</h2>
              {sepet.lines.map((s) => {
                const payPct = s.urun.xml ? 0 : lineDiscountPct(pricing, s.urun.marka, paymentId);
                const gaPct = s.urun.xml ? 0 : gelAlBonus;
                const satirKurus = Math.round(s.kdvDahilBirimKurus * s.adet * (1 - payPct / 100) * (1 - gaPct / 100));
                return (
                  <div className="cart-line" key={`${s.productId}:${s.warehouseId}`}>
                    {s.urun.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="cli-image" src={s.urun.imageUrl} alt={s.urun.marka} loading="lazy" />
                    ) : (
                      <span className="cli-image bos" aria-hidden="true" />
                    )}

                    <div className="cli-main">
                      <div className="product-name" title={`${s.urun.size} ${s.urun.pattern}`}>
                        {s.urun.size} {s.urun.pattern}
                      </div>

                      <div className="cli-brand-row">
                        {s.urun.brandLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="brand-logo" src={s.urun.brandLogoUrl} alt={s.urun.marka} title={s.urun.marka} />
                        ) : (
                          <strong className="cli-brand-name">{s.urun.marka}</strong>
                        )}
                        {s.urun.dotYear ? <span className="cli-year">{s.urun.dotYear}</span> : null}
                        <SeasonIcon mevsim={s.urun.mevsim} size={16} />
                        <span className="cli-sku">{s.urun.stockCode}</span>
                      </div>
                    </div>

                    <div className="cli-right">
                      <span className="stepper acikta cli-stepper">
                        {s.adet === 1 ? (
                          <button
                            type="button"
                            className="stepper-remove"
                            aria-label="Kaldır"
                            title="Kaldır"
                            onClick={() => {
                              sepet.removeItem(s.productId, s.warehouseId);
                              showToast("Sepetten çıkarıldı", "bilgi");
                            }}
                          >
                            <TrashIcon size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label="Azalt"
                            onClick={() => {
                              sepet.setQty(s.productId, s.warehouseId, s.adet - 1);
                              showToast("Adet güncellendi", "bilgi");
                            }}
                          >
                            −
                          </button>
                        )}
                        <input readOnly value={s.adet} aria-label="Adet" tabIndex={-1} />
                        <button
                          type="button"
                          aria-label="Artır"
                          onClick={() => {
                            sepet.setQty(s.productId, s.warehouseId, s.adet + 1);
                            showToast("Adet güncellendi", "ok");
                          }}
                        >
                          +
                        </button>
                      </span>
                      <div className="cli-total"><AnimatedMoney kurus={satirKurus} /></div>
                    </div>
                  </div>
                );
              })}

              {/* Sepetiniz kartının altında teslimat yöntemi + özet */}
              <div className="cart-summary">
                <div className="summary-teslimat">
                  <label htmlFor="teslimatSelect">Teslimat Yöntemi</label>
                  <select
                    id="teslimatSelect"
                    className="teslimat-select"
                    value={deliveryId}
                    onChange={(e) => setDeliveryId(e.target.value)}
                  >
                    {DELIVERY_METHODS.map((d) => {
                      // Gel Al yalnız İstanbul teslimat adresinde açık.
                      const gelAlKapali = d.id === "gelAl" && !istanbulTeslimat;
                      return (
                        <option key={d.id} value={d.id} disabled={gelAlKapali}>
                          {d.title}
                          {d.id === "gelAl"
                            ? gelAlKapali
                              ? " (yalnız İstanbul)"
                              : (pricing?.gelAlBonus ?? 0) > 0
                                ? ` (+%${pricing?.gelAlBonus} iskonto)`
                                : ""
                            : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="summary-row">
                  <span>Ara Toplam</span>
                  <span><AnimatedMoney kurus={totals.matrahToplamKurus} /></span>
                </div>
                <div className="summary-row">
                  <span>KDV</span>
                  <span><AnimatedMoney kurus={totals.kdvToplamKurus} /></span>
                </div>
                {totals.indirimToplamKurus > 0 ? (
                  <div className="summary-row indirim">
                    <span>İskonto</span>
                    <span>− <AnimatedMoney kurus={totals.indirimToplamKurus} /></span>
                  </div>
                ) : null}
                <div className="summary-row grand">
                  <span>Toplam</span>
                  <span><AnimatedMoney kurus={totals.totalKurus} /></span>
                </div>

                {limitExceeded ? (
                  <div className="alert warn summary-warning">
                    Sepet toplamı kalan kredi limitinizi (
                    {formatKurus(Math.max(0, REMAINING_LIMIT_KURUS))}) aşıyor.
                  </div>
                ) : null}

                <button
                  className="primary summary-order"
                  onClick={siparisVer}
                  disabled={
                    submitting ||
                    sepet.lines.length === 0 ||
                    (kartOdeme && !kartGecerli) ||
                    (kartOdeme && paynetCfg === false) ||
                    (taksitOdeme && (!kartGecerli || !secilenTaksit))
                  }
                >
                  {submitting
                    ? "Sipariş oluşturuluyor…"
                    : kartOdeme || taksitOdeme
                      ? "Kredi Kartı ile Öde"
                      : "Sipariş Ver"}
                </button>

                <button
                  className="summary-clear"
                  type="button"
                  onClick={() => {
                    sepet.clear();
                    showToast("Sepetiniz temizlendi", "bilgi");
                  }}
                >
                  Sepeti Temizle
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
