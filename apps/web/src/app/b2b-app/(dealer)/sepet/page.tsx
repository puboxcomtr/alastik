"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, SeasonIcon, TrashIcon } from "@components/b2b-theme/icons";
import { useCart } from "@components/b2b-theme/cart-status";
import { showToast } from "@components/b2b-theme/toast";
import { formatKurus } from "@components/b2b-theme/lib/format";
import { AnimatedMoney } from "@components/b2b-theme/animated-money";
import { DeliveryAddress } from "@components/b2b-theme/delivery-address";
import { API_ENDPOINTS } from "@src/config/api";
import {
  B2bPricing,
  CREDIT_CLOSED_LABELS,
  computeDiscountedTotals,
  effectiveLineDiscountPct,
} from "@components/b2b-theme/lib/payment-pricing";
import { fetchCartFinancialDiscounts, productShippingKurus, PREMIUM_TIER, type FinancialDiscounts } from "@components/b2b-theme/lib/financial-discounts";
import { AccountNotices } from "@components/b2b-theme/account-notices";
import { fetchDepotStocks } from "@components/b2b-theme/lib/depot-stock";
import { launchPaynetForm, PAYNET_PROVIDER } from "@components/b2b-theme/lib/paynet-form";

type DeliveryMethod = { id: string; title: string; free: boolean };

function formatIban(iban: string): string {
  return (iban || "")
    .replace(/\s+/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

const ORDER_NOTE_MAX_LENGTH = 128;

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
  const [financial, setFinancial] = useState<FinancialDiscounts>({ tier: "", discounts: {} });
  const [paymentId, setPaymentId] = useState("");
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [deliveryId, setDeliveryId] = useState("");
  const [deliveryAddressId, setDeliveryAddressId] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const deliveryPicked = useRef(false);
  const [noDealer, setNoDealer] = useState(false);
  useEffect(() => {
    try {
      setNoDealer(!localStorage.getItem("authToken") && !!localStorage.getItem("plasiyerToken"));
    } catch {  }
  }, []);
  const selectDealer = () => {
    try { sessionStorage.removeItem("plasiyerDevam"); } catch {  }
    window.location.reload();
  };
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [paynetCfg, setPaynetCfg] = useState<
    { publishableKey: string; jsUrl: string; apiUrl: string; mode: string } | null | false
  >(null);
  const [taksitOps, setTaksitOps] = useState<
    { instalment: number; desc: string; instalmentAmount: number; totalAmount: number; vPosId?: number }[]
    | null
    | "loading"
  >(null);
  const [taksitProvider, setTaksitProvider] = useState("");
  const [secilenTaksit, setSecilenTaksit] = useState(0);

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

  useEffect(() => {
    if (paymentId !== "kkTek" && paymentId !== "kkTaksit") return;
    if (paynetCfg) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    if (!token) return;
    fetch(API_ENDPOINTS.b2b.paynetConfig(), {
      headers: { Authorization: `Bearer ${token}`, "X-Site": "b2b" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => setPaynetCfg(res?.success && res.data ? res.data : false))
      .catch(() => setPaynetCfg(false));
  }, [paymentId, paynetCfg]);

  function startPaynet(
    order: { orderId: string; orderNumber: string; total: number; paymentToken: string },
    cfg: { publishableKey: string; jsUrl: string }
  ) {
    const [mm, yy] = card.expiry.split("/");
    launchPaynetForm({
      action: API_ENDPOINTS.b2b.paynetReturn(),
      fields: { orderId: order.orderId, pt: order.paymentToken, returnOrigin: window.location.origin },
      card: {
        holder: card.name.trim(),
        number: card.number.replace(/\D/g, ""),
        expMonth: String(parseInt(mm || "0", 10)),
        expYear: `20${(yy || "").padStart(2, "0")}`,
        cvv: card.cvv.replace(/\D/g, ""),
      },
      config: cfg,
      amountTL: Number(order.total),
      reference: order.orderNumber,
      errorTarget: { kind: "order", id: order.orderId, pt: order.paymentToken },
      onError: (message) => { showToast(message, "hata"); setSubmitting(false); },
    });
  }

  function startPaynetInstallment(
    order: { orderId: string; orderNumber: string; total: number; paymentToken: string },
    cfg: { publishableKey: string; jsUrl: string }
  ) {
    const [mm, yy] = card.expiry.split("/");
    launchPaynetForm({
      action: API_ENDPOINTS.b2b.paynetReturn(),
      fields: { orderId: order.orderId, pt: order.paymentToken, returnOrigin: window.location.origin },
      card: {
        holder: card.name.trim(),
        number: card.number.replace(/\D/g, ""),
        expMonth: String(parseInt(mm || "0", 10)),
        expYear: `20${(yy || "").padStart(2, "0")}`,
        cvv: card.cvv.replace(/\D/g, ""),
      },
      config: cfg,
      amountTL: Number(order.total),
      reference: order.orderNumber,
      installment: secilenTaksit,
      errorTarget: { kind: "order", id: order.orderId, pt: order.paymentToken },
      onError: (message) => { showToast(message, "hata"); setSubmitting(false); },
    });
  }

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
        window.location.href = res.threeDUrl;
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
    if ((kartOdeme || (taksitOdeme && taksitProvider === PAYNET_PROVIDER)) && !paynetCfg) {
      showToast("Kredi kartı ödemesi şu anda kullanılamıyor.", "hata");
      return;
    }
    setSubmitting(true);
    try {
      const items = sepet.lines.map(s => ({ stockCode: s.urun.diaStockCode || s.urun.stockCode, xml: !!s.urun.xml, quantity: s.adet }));
      const res = await fetch(API_ENDPOINTS.b2b.siparis(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Site": "b2b"
        },
        body: JSON.stringify({ items, paymentMethod: paymentId, deliveryMethod: deliveryId, deliveryAddressId, orderNote: orderNote.trim() })
      }).then(r => r.json());
      if (!res?.success || !res.data) {
        showToast(res?.message || "Sipariş oluşturulamadı.", "hata");
        setSubmitting(false);
        return;
      }
      if (res.data.requiresPayment) {
        try {
          sessionStorage.setItem("b2bOdemeAkisi", String(res.data.orderNumber || "1"));
        } catch {
        }
        if (taksitOdeme && taksitProvider === PAYNET_PROVIDER) {
          startPaynetInstallment(res.data, paynetCfg as { publishableKey: string; jsUrl: string });
        } else if (taksitOdeme) {
          await taksitOde(res.data);
        } else {
          startPaynet(res.data, paynetCfg as { publishableKey: string; jsUrl: string });
        }
        return;
      }
      showToast("Siparişiniz oluşturuldu.", "ok");
      sepet.clear();
      router.push("/siparisler");
    } catch {
      showToast("Sipariş oluşturulamadı.", "hata");
      setSubmitting(false);
    }
  }

  useEffect(() => {
    fetch(API_ENDPOINTS.payment.bankAccounts(), { headers: { "X-Site": "b2b" } })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) setBankAccounts(res.data);
      })
      .catch(() => {});
  }, []);

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
          const firstOpen = (res.data.methods || []).find((m: { disabled?: boolean }) => !m.disabled);
          setPaymentId((prev) => prev || firstOpen?.id || "");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    if (!t) return;
    let cancelled = false;
    fetch(API_ENDPOINTS.b2b.teslimatYontemleri(deliveryAddressId), {
      headers: { Authorization: `Bearer ${t}`, "X-Site": "b2b" },
    })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled || !res?.success || !Array.isArray(res.data)) return;
        const methods: DeliveryMethod[] = res.data;
        setDeliveryMethods(methods);
        setDeliveryId((prev) => (deliveryPicked.current && methods.some((m) => m.id === prev) ? prev : methods[0]?.id || ""));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [deliveryAddressId]);

  const cartCodes = sepet.lines.map((l) => l.urun.stockCode).filter(Boolean).sort().join(",");
  useEffect(() => {
    let cancelled = false;
    fetchCartFinancialDiscounts(cartCodes ? cartCodes.split(",") : []).then((result) => {
      if (!cancelled) setFinancial(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cartCodes]);

  const stockCodeOf = (urun: { xml?: boolean; diaStockCode?: string; stockCode: string }) => urun.diaStockCode || urun.stockCode;
  const ownStockCodes = [...new Set(sepet.lines.filter((l) => !l.urun.xml).map((l) => stockCodeOf(l.urun)).filter(Boolean))].sort().join(",");
  const [availableStock, setAvailableStock] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    if (!ownStockCodes) {
      setAvailableStock({});
      return;
    }
    fetchDepotStocks(ownStockCodes.split(",")).then((map) => {
      if (cancelled || !map) return;
      const result: Record<string, number> = {};
      for (const [code, depots] of Object.entries(map)) result[code] = depots.reduce((sum, d) => sum + (d.adet || 0), 0);
      setAvailableStock(result);
    });
    return () => {
      cancelled = true;
    };
  }, [ownStockCodes]);
  const requestedByCode: Record<string, number> = {};
  for (const l of sepet.lines) {
    if (l.urun.xml) continue;
    const code = stockCodeOf(l.urun);
    requestedByCode[code] = (requestedByCode[code] || 0) + l.adet;
  }
  const stockShortOf = (urun: { xml?: boolean; diaStockCode?: string; stockCode: string }): number | null => {
    if (urun.xml) return null;
    const code = stockCodeOf(urun);
    const available = availableStock[code];
    if (available === undefined) return null;
    return (requestedByCode[code] || 0) > available ? available : null;
  };
  const stockShortCount = Object.keys(requestedByCode).filter((code) => availableStock[code] !== undefined && requestedByCode[code] > availableStock[code]).length;
  const stockWarned = useRef("");
  useEffect(() => {
    if (!stockShortCount) return;
    const key = Object.keys(requestedByCode).sort().map((c) => `${c}:${requestedByCode[c]}:${availableStock[c]}`).join("|");
    if (stockWarned.current === key) return;
    stockWarned.current = key;
    showToast("Sepetinizdeki bazı ürünlerin stoğu yetersiz. İşaretli satırları güncelleyin.", "hata");
  });

  const freeDelivery = deliveryMethods.find((d) => d.id === deliveryId)?.free === true;
  const cartShipping = freeDelivery ? {} : financial.shipping;
  const totals = computeDiscountedTotals(sepet.lines, pricing, paymentId, financial.discounts, cartShipping);
  const cartDiscountPct = (methodId: string): number => {
    const t = computeDiscountedTotals(sepet.lines, pricing, methodId, financial.discounts, cartShipping);
    const original = t.totalKurus - t.kargoToplamKurus + t.indirimToplamKurus;
    return original > 0 ? (t.indirimToplamKurus / original) * 100 : 0;
  };

  const creditLimit = pricing?.creditLimit;
  const limitExceeded = Boolean(
    creditLimit?.hasLimit && totals.totalKurus > creditLimit.remainingLimitKurus,
  );
  const orderingClosed = creditLimit?.orderingClosed === true;
  const cartBlocked = sepet.blocked || creditLimit?.cartClosed === true;

  const kartOdeme = paymentId === "kkTek";
  const kartGecerli =
    card.number.replace(/\D/g, "").length >= 15 &&
    card.name.trim().length >= 3 &&
    /^\d{2}\/\d{2}$/.test(card.expiry) &&
    card.cvv.replace(/\D/g, "").length >= 3;

  const taksitOdeme = paymentId === "kkTaksit";
  const kartBin = card.number.replace(/\D/g, "").slice(0, 6);

  useEffect(() => {
    if (!submitting && sepet.hydrated && sepet.lines.length === 0) {
      router.replace("/");
    }
  }, [submitting, sepet.hydrated, sepet.lines.length, router]);

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
        setTaksitProvider(String(res?.data?.provider || ""));
        setTaksitOps(ops);
        setSecilenTaksit(ops[0]?.instalment || 0);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setTaksitOps([]);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taksitOdeme, kartBin, totals.totalKurus]);

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

      <AccountNotices />

      {noDealer ? (
        <div className="alert warn account-notice" role="alert">
          <span>Sipariş verebilmek için önce bir bayi seçmelisiniz. Sepetinizdeki ürünler korunur.</span>
          <button type="button" className="account-notice-link" onClick={selectDealer}>Bayi Seç</button>
        </div>
      ) : null}

      {sepet.lines.length === 0 || noDealer ? null : (
        <div className="cart-layout">
          <div className="cart-left">
            <DeliveryAddress onSelectedChange={(a) => setDeliveryAddressId(a?.id || "")} />

            <div className="cart-card payment-method-card">
              <h2 className="cart-card-title">Ödeme Yöntemi</h2>
              {pricing && pricing.methods.length > 0 ? (
                <div className="payment-grid">
                  {pricing.methods.map((m) => {
                    const secili = m.id === paymentId;
                    const methodPct = cartDiscountPct(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`payment-option${secili ? " secili" : ""}${m.disabled ? " kapali" : ""}`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={secili}
                          disabled={m.disabled}
                          onChange={() => setPaymentId(m.id)}
                        />
                        <span className="po-radio" aria-hidden="true" />
                        <span className="po-title">
                          {financial.tier === PREMIUM_TIER && m.id === creditLimit?.methodId ? `Premium ${m.title}` : m.title}
                          {typeof m.termDays === "number" && m.termDays > 0 ? <span className="po-term">{m.termDays} Gün Vade</span> : null}
                        </span>
                        {m.disabled ? (
                          <span className="po-closed">{CREDIT_CLOSED_LABELS[creditLimit?.reason || ""] || "Kapalı"}</span>
                        ) : methodPct > 0 ? (
                          <span className="po-discount">%{methodPct.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} İskonto</span>
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

            <div className="cart-card order-note-card">
              <h2 className="cart-card-title">Sipariş Açıklaması</h2>
              <textarea
                id="orderNote"
                className="order-note-input"
                rows={2}
                maxLength={ORDER_NOTE_MAX_LENGTH}
                placeholder="Siparişinizle ilgili iletmek istediğiniz bir not varsa buraya yazabilirsiniz."
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
              />
              <div className="order-note-count">{orderNote.length}/{ORDER_NOTE_MAX_LENGTH}</div>
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

          <aside className="cart-right">
            <div className="cart-card">
              <h2 className="cart-card-title">Sepetiniz</h2>
              {sepet.lines.map((s) => {
                const payPct = effectiveLineDiscountPct(pricing, s.urun, paymentId, financial.discounts);
                const kargo = productShippingKurus(cartShipping, s.urun.stockCode);
                const satirKurus = Math.round(s.kdvDahilBirimKurus * s.adet * (1 - payPct / 100)) + (kargo.excluded ? 0 : kargo.kurus * s.adet);
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
                      {(() => {
                        const kalan = stockShortOf(s.urun);
                        if (kalan === null) return null;
                        return <div className="cli-stock-warning">{kalan > 0 ? `Stokta ${kalan} adet kaldı` : "Stokta kalmadı"}</div>;
                      })()}
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
                            if (sepet.setQty(s.productId, s.warehouseId, s.adet + 1)) showToast("Adet güncellendi", "ok");
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

              <div className="cart-summary">
                <div className="summary-teslimat">
                  <label htmlFor="teslimatSelect">Teslimat Yöntemi</label>
                  <select
                    id="teslimatSelect"
                    className="teslimat-select"
                    value={deliveryId}
                    onChange={(e) => {
                      deliveryPicked.current = true;
                      setDeliveryId(e.target.value);
                    }}
                  >
                    {deliveryMethods.map((d) => (
                      <option key={d.id} value={d.id}>{d.title}{d.free ? " (Ücretsiz)" : ""}</option>
                    ))}
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
                {totals.ayriKargoKurus > 0 ? (
                  <div className="summary-row">
                    <span>Kargo Bedeli</span>
                    <span><AnimatedMoney kurus={totals.ayriKargoKurus} /></span>
                  </div>
                ) : null}
                <div className="summary-row grand">
                  <span>Toplam</span>
                  <span><AnimatedMoney kurus={totals.totalKurus} /></span>
                </div>

                {orderingClosed ? (
                  <div className="alert error summary-warning">{creditLimit?.orderingClosedMessage}</div>
                ) : null}

                {limitExceeded && !orderingClosed ? (
                  <div className="alert warn summary-warning">
                    Sepet toplamı kalan cari limitinizi (
                    {formatKurus(Math.max(0, creditLimit?.remainingLimitKurus ?? 0))}) aşıyor. Sepet tutarını azaltın ya da ödeme yaparak limitinizi açın.
                  </div>
                ) : null}

                <button
                  className="primary summary-order"
                  onClick={cartBlocked ? sepet.notifyBlocked : siparisVer}
                  disabled={
                    !cartBlocked && (
                      submitting ||
                      sepet.lines.length === 0 ||
                      orderingClosed ||
                      limitExceeded ||
                      (kartOdeme && !kartGecerli) ||
                      (kartOdeme && paynetCfg === false) ||
                      (taksitOdeme && (!kartGecerli || !secilenTaksit))
                    )
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
