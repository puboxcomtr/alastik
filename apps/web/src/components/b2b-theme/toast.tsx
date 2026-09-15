"use client";

// ALastik/LJA ile aynı toast: react-toastify. ToastContainer ve CSS zaten kök
// layout'ta (src/app/layout.tsx) tanımlı (bottom-right, light). Buradaki
// showToast yalnız ince bir sarmalayıcıdır; b2b bileşenleri bunu çağırır.
//
// Sepet hızlı güncellenince (adet +/−) toast'lar ÜST ÜSTE YIĞILMASIN diye tek
// bir toastId kullanılır: aktifse mevcut toast güncellenir (içerik + tip) ve
// süresi baştan sayılır; değilse yeni açılır.
import { toast } from "react-toastify";

const TOAST_ID = "b2b-toast";
const AUTO_CLOSE = 2500;

export function showToast(mesaj: string, tip: "ok" | "bilgi" = "ok"): void {
  const type = tip === "ok" ? "success" : "info";
  if (toast.isActive(TOAST_ID)) {
    toast.update(TOAST_ID, { render: mesaj, type, autoClose: AUTO_CLOSE });
  } else {
    toast(mesaj, { toastId: TOAST_ID, type, autoClose: AUTO_CLOSE });
  }
}
