import { API_ENDPOINTS } from "@src/config/api";

export const PAYNET_PROVIDER = "paynet";

export interface PaynetCard {
  holder: string;
  number: string;
  expMonth: string;
  expYear: string;
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

export interface PaynetErrorTarget { kind: "payment" | "order"; id: string; pt: string }

const HOST_ID = "paynet-host";
const FORM_ID = "paynet-form";
const TRIGGER_DELAY_MS = 400;
const INSTALLMENT_KEY_TIMEOUT_MS = 15000;
const MIN_INSTALLMENT_COUNT = 2;

const DECLINED_MESSAGE = "Ödemeniz bankanız tarafından reddedildi. Lütfen kart bilgilerinizi kontrol edip tekrar deneyiniz.";
const INSTALLMENT_UNAVAILABLE_MESSAGE = "Seçilen taksit seçeneği bu kart için kullanılamıyor. Lütfen başka bir seçenek deneyiniz.";
const LOAD_FAILED_MESSAGE = "Ödeme altyapısı yüklenemedi, tekrar deneyin.";
const STALLED_MESSAGE = "Ödeme ekranına geçilemedi. Lütfen kart bilgilerinizi kontrol edip tekrar deneyiniz.";
const STALL_TIMEOUT_MS = 30000;
const PAYNET_TDS_PATH = "paynetjgate/tds";

function reportPaynetError(target: PaynetErrorTarget | undefined, message: string, code?: string | number): void {
  if (!target) return;
  let token = "";
  try { token = localStorage.getItem("authToken") || ""; } catch {  }
  fetch(API_ENDPOINTS.b2b.paynetClientError(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Site": "b2b" },
    body: JSON.stringify({ ...target, message, code: code === undefined ? "" : String(code) }),
    keepalive: true,
  }).catch(() => {  });
}

export function launchPaynetForm(opts: {
  action: string;
  fields: Record<string, string>;
  card: PaynetCard;
  config: { publishableKey: string; jsUrl: string };
  amountTL: number;
  reference: string;
  installment?: number;
  errorTarget?: PaynetErrorTarget;
  onError: (message: string) => void;
}): void {
  const installment = Number(opts.installment) >= MIN_INSTALLMENT_COUNT ? Number(opts.installment) : 0;

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
  s.setAttribute("data-amount", opts.amountTL.toFixed(2).replace(".", ","));
  s.setAttribute("data-reference_no", opts.reference);
  s.setAttribute("data-tds_required", "true");
  s.setAttribute("data-no_instalment", installment ? "false" : "true");
  s.setAttribute("data-transaction_type", "1");
  s.setAttribute("data-show_tds_error", "false");

  s.onload = () => {
    const paynet = (window as unknown as { Paynet?: PaynetGlobal }).Paynet;
    stallTimer = window.setTimeout(() => {
      if (document.querySelector(`iframe[src*="${PAYNET_TDS_PATH}"]`)) { stallTimer = 0; return; }
      fail(STALLED_MESSAGE, "STALLED");
    }, STALL_TIMEOUT_MS);
    try {
      paynet?.events?.onAuthentication?.((res) => {
        if (res && res.ok === false) {
          fail(String(res.message || res.error_message || res.md_error_message || res.errorMessage || DECLINED_MESSAGE));
        }
      });
      paynet?.events?.validationError?.((res) => {
        if (res && res.ok === false) fail(String(res.message || DECLINED_MESSAGE), res.code);
      });
      paynet?.events?.onCreateToken?.((res) => {
        if (res && res.ok === false) fail(String(res.message || DECLINED_MESSAGE), res.code);
        else stopStallTimer();
      });
      paynet?.events?.onTdsRedirect?.(() => stopStallTimer());
    } catch {  }

    if (!installment || !keyInput) {
      window.setTimeout(() => submitBtn.click(), TRIGGER_DELAY_MS);
      return;
    }

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
    } catch {  }
    window.setTimeout(() => numberInput.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true })), TRIGGER_DELAY_MS);
  };
  s.onerror = () => fail(LOAD_FAILED_MESSAGE, "LOAD_FAILED");
  host.appendChild(s);
}
