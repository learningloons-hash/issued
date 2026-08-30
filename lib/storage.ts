import { emptySeller } from "./document";
import type { Seller } from "./types";

export const SELLER_STORAGE_KEY = "issued.seller.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseSeller(raw: unknown): Seller {
  const fallback = emptySeller();
  if (!isRecord(raw)) return fallback;

  return {
    businessName: typeof raw.businessName === "string" ? raw.businessName : "",
    contactName: typeof raw.contactName === "string" ? raw.contactName : "",
    mobile: typeof raw.mobile === "string" ? raw.mobile : "",
    email: typeof raw.email === "string" ? raw.email : "",
    address: typeof raw.address === "string" ? raw.address : "",
    paynowProxy: typeof raw.paynowProxy === "string" ? raw.paynowProxy : "",
    proxyType: raw.proxyType === "uen" ? "uen" : "mobile",
    gstRegNo: typeof raw.gstRegNo === "string" ? raw.gstRegNo : "",
    logoDataUrl: typeof raw.logoDataUrl === "string" ? raw.logoDataUrl : "",
  };
}

export function loadSeller(): Seller {
  if (typeof window === "undefined") return emptySeller();
  try {
    const stored = window.localStorage.getItem(SELLER_STORAGE_KEY);
    if (!stored) return emptySeller();
    return parseSeller(JSON.parse(stored));
  } catch {
    return emptySeller();
  }
}

export function saveSeller(seller: Seller): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SELLER_STORAGE_KEY, JSON.stringify(seller));
}
