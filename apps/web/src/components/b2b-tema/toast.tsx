"use client";

// ALastik/LJA ile aynı toast: react-toastify. ToastContainer ve CSS zaten kök
// layout'ta (src/app/layout.tsx) tanımlı (bottom-right, light). Buradaki
// toastGoster yalnız ince bir sarmalayıcıdır; b2b bileşenleri bunu çağırır.
import { toast } from "react-toastify";

export function toastGoster(mesaj: string, tip: "ok" | "bilgi" = "ok"): void {
  if (tip === "ok") {
    toast.success(mesaj);
  } else {
    toast.info(mesaj);
  }
}
