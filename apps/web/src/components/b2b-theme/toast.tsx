"use client";

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
