// Paynet Özelleştirilmiş Form'u (paynet-custom.js) kurar ve tokenizasyonu tetikler — taksit destekli.
// Kart bilgisi bu gizli form üzerinden DOĞRUDAN Paynet'e gider; sunucumuza gelmez. Kütüphane kartı token'lar,
// 3D yönlendirmesini yapar ve formu session_id / token_id ile `action` adresine POST eder.
// Taksitli ödemede kütüphane, kartın BIN'i için taksit anahtarlarını kendisi verir; seçilen taksit sayısının
// anahtarı forma yazılıp gönderilir.
// Kütüphanenin hata olayları (validationError, onCreateToken, onAuthentication) dinlenir: hata formda gösterilir
// ve bekleyen kayda yazılır. Belli sürede 3D'ye geçilemezse de hata verilir (kütüphane sessiz kalırsa takılmasın).
import { API_ENDPOINTS } from "@src/config/api";

// Sunucunun taksit seçenekleriyle bildirdiği sağlayıcı anahtarı (routes/web/b2b/payment.js INSTALLMENT_PROVIDERS.PAYNET)
export const PAYNET_PROVIDER = "paynet";

export interface PaynetCard {
  holder: string;
  number: string;   // yalnız rakam
  expMonth: string; // "1".."12"
  expYear: string;  // "2028"
  cvv: string;
}

interface PaynetInstallment { instalment: number; instalment_key: string }
interface PaynetBinResult { ok?: boolean; message?: string; bank?: { installments?: PaynetInstallment[] } }
interface PaynetAuthResult { ok?: boolean; message?: string; error_message?: string; md_error_message?: string; errorMessage?: string }
interface PaynetEventResult { ok?: boolean; message?: string; code?: number | string }
interface PaynetGlobal {
  events?: {
    onAuthentication?: (fn: (res: PaynetAuthResult) => void) => void;
    onCheckBin?: (fn: (res?: PaynetBinResult) => void) => void;
    validationError?: (fn: (res?: PaynetEventResult) => void) => void;
    onCreateToken?: (fn: (res?: PaynetEventResult) => void) => void;
    onTdsRedirect?: (fn: () => void) => void;
  };
}

/** Hatanın yazılacağı bekleyen kayıt: Ödeme Yap (payment) ya da kartlı sipariş (order) */
export interface PaynetErrorTarget { kind: "payment" | "order"; id: string; pt: string }

const HOST_ID = "paynet-host";
const FORM_ID = "paynet-form";
// Kütüphane forma bağlandıktan sonra tetikleme gecikmesi
const TRIGGER_DELAY_MS = 400;
// Taksit anahtarı bu sürede gelmezse hata gösterilir
const INSTALLMENT_KEY_TIMEOUT_MS = 15000;
// Bu sayıdan az taksit = tek çekim
const MIN_INSTALLMENT_COUNT = 2;

const DECLINED_MESSAGE = "Ödemeniz bankanız tarafından reddedildi. Lütfen kart bilgilerinizi kontrol edip tekrar deneyiniz.";
const INSTALLMENT_UNAVAILABLE_MESSAGE = "Seçilen taksit seçeneği bu kart için kullanılamıyor. Lütfen başka bir seçenek deneyiniz.";
const LOAD_FAILED_MESSAGE = "Ödeme altyapısı yüklenemedi, tekrar deneyin.";
const STALLED_MESSAGE = "Ödeme ekranına geçilemedi. Lütfen kart bilgilerinizi kontrol edip tekrar deneyiniz.";
// Kütüphane yüklendikten sonra bu sürede kart token'lanıp 3D'ye geçilmezse hata gösterilir
const STALL_TIMEOUT_MS = 30000;
// Paynet'in 3D ekranını açtığı iframe adresindeki yol
const PAYNET_TDS_PATH = "paynetjgate/tds";

/** Tarayıcıdaki Paynet hatasını bekleyen kayda yazdırır (panelde Ödemeler / sipariş detayında görünür) */
function reportPaynetError(target: PaynetErrorTarget | undefined, message: string, code?: string | number): void {
  if (!target) return;
  let token = "";
  try { token = localStorage.getItem("authToken") || ""; } catch { /* depolama kapalı */ }
  fetch(API_ENDPOINTS.b2b.paynetClientError(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Site": "b2b" },
    body: JSON.stringify({ ...target, message, code: code === undefined ? "" : String(code) }),
    keepalive: true,
  }).catch(() => { /* kayıt yazılamazsa kullanıcıya etkisi yok */ });
}

export function launchPaynetForm(opts: {
  /** Kütüphanenin 3D sonrası POST edeceği adres */
  action: string;
  /** Formla birlikte gönderilecek gizli alanlar (ödeme / sipariş kimliği, doğrulama anahtarı…) */
  fields: Record<string, string>;
  card: PaynetCard;
  config: { publishableKey: string; jsUrl: string };
  amountTL: number;
  reference: string;
  /** 2 ve üzeri: taksitli; boş / 1: tek çekim */
  installment?: number;
  /** Hata olursa yazılacak bekleyen kayıt */
  errorTarget?: PaynetErrorTarget;
  onError: (message: string) => void;
}): void {
  const installment = Number(opts.installment) >= MIN_INSTALLMENT_COUNT ? Number(opts.installment) : 0;

  // Hata yalnız bir kez gösterilir ve kayda yazılır; 3D'ye geçildiyse (ya da token oluştuysa) zaman aşımı durur
  let finished = false;
  let stallTimer = 0;
  const stopStallTimer = () => { if (stallTimer) window.clearTimeout(stallTimer); stallTimer = 0; };
  const fail = (message: string, code?: string | number) => {
    if (finished) return;
    finished = true;
    stopStallTimer();
    reportPaynetError(opts.errorTarget, message, code);
    opts.onError(message);
  };

  document.getElementById(HOST_ID)?.remove();
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.display = "none";
  document.body.appendChild(host);

  const form = document.createElement("form");
  form.id = FORM_ID;
  form.method = "post";
  form.action = opts.action;

  const hidden = (name: string, value: string) => {
    const i = document.createElement("input");
    i.type = "hidden"; i.name = name; i.value = value; form.appendChild(i);
  };
  for (const [name, value] of Object.entries(opts.fields)) hidden(name, value);
  if (installment) hidden("installment", String(installment));

  const paynetInput = (attr: string, value: string) => {
    const i = document.createElement("input");
    i.setAttribute("data-paynet", attr); i.type = "hidden"; i.value = value; form.appendChild(i);
    return i;
  };
  paynetInput("holderName", opts.card.holder);
  const numberInput = paynetInput("number", opts.card.number);
  paynetInput("exp-month", opts.card.expMonth);
  paynetInput("exp-year", opts.card.expYear);
  paynetInput("cvv", opts.card.cvv);
  const keyInput = installment ? paynetInput("installmentKey", "") : null;

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.setAttribute("data-paynet", "submit");
  submitBtn.textContent = "Öde";
  form.appendChild(submitBtn);
  host.appendChild(form);

  const s = document.createElement("script");
  s.type = "text/javascript";
  s.className = "paynet-button";
  s.src = opts.config.jsUrl;
  s.setAttribute("data-form", `#${FORM_ID}`);
  s.setAttribute("data-key", opts.config.publishableKey);
  // data-amount = TR biçimli TL (virgül ondalık); kütüphane ×100 ile kuruşa çevirir
  s.setAttribute("data-amount", opts.amountTL.toFixed(2).replace(".", ","));
  s.setAttribute("data-reference_no", opts.reference);
  s.setAttribute("data-tds_required", "true");
  // Sunucudaki tahsilat isteğiyle birebir aynı olmalı (tek çekim: true, taksitli: false)
  s.setAttribute("data-no_instalment", installment ? "false" : "true");
  s.setAttribute("data-transaction_type", "1");
  // Paynet'in kendi 3D hata penceresi kapalı — hata formda gösterilir
  s.setAttribute("data-show_tds_error", "false");

  s.onload = () => {
    const paynet = (window as unknown as { Paynet?: PaynetGlobal }).Paynet;
    stallTimer = window.setTimeout(() => {
      // 3D ekranı (Paynet iframe) açıksa bayi şifre giriyordur — hata verilmez
      if (document.querySelector(`iframe[src*="${PAYNET_TDS_PATH}"]`)) { stallTimer = 0; return; }
      fail(STALLED_MESSAGE, "STALLED");
    }, STALL_TIMEOUT_MS);
    try {
      paynet?.events?.onAuthentication?.((res) => {
        if (res && res.ok === false) {
          fail(String(res.message || res.error_message || res.md_error_message || res.errorMessage || DECLINED_MESSAGE));
        }
      });
      // Kart bilgisi hatası (ör. "Yıl bilgisi yanlış") — kütüphane bunu yalnız bu olayla bildirir
      paynet?.events?.validationError?.((res) => {
        if (res && res.ok === false) fail(String(res.message || DECLINED_MESSAGE), res.code);
      });
      // Kart token'lanamadı (kart / tutar reddi vb.); token oluştuysa 3D'ye geçilir, zaman aşımı durur
      paynet?.events?.onCreateToken?.((res) => {
        if (res && res.ok === false) fail(String(res.message || DECLINED_MESSAGE), res.code);
        else stopStallTimer();
      });
      paynet?.events?.onTdsRedirect?.(() => stopStallTimer());
    } catch { /* kanca kurulamazsa zaman aşımı hatayı gösterir */ }

    if (!installment || !keyInput) {
      window.setTimeout(() => submitBtn.click(), TRIGGER_DELAY_MS);
      return;
    }

    // Taksitli: kartın BIN'i için taksit anahtarlarını iste, seçilen taksitin anahtarını forma yaz, sonra gönder
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      fail(INSTALLMENT_UNAVAILABLE_MESSAGE);
    }, INSTALLMENT_KEY_TIMEOUT_MS);
    try {
      paynet?.events?.onCheckBin?.((res) => {
        if (settled || !res) return;
        settled = true;
        window.clearTimeout(timeout);
        const match = res.ok === false ? null : (res.bank?.installments || []).find((i) => Number(i.instalment) === installment);
        if (!match?.instalment_key) {
          fail(res.ok === false && res.message ? String(res.message) : INSTALLMENT_UNAVAILABLE_MESSAGE);
          return;
        }
        keyInput.value = match.instalment_key;
        submitBtn.click();
      });
    } catch { /* kanca kurulamazsa zaman aşımı hatayı gösterir */ }
    window.setTimeout(() => numberInput.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true })), TRIGGER_DELAY_MS);
  };
  s.onerror = () => fail(LOAD_FAILED_MESSAGE, "LOAD_FAILED");
  host.appendChild(s);
}
