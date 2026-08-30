import { TEMPLATES } from "./templates";
import type { DocumentKind, TemplateId } from "./types";

export const ISSUED_FOOTER = "Generated with Issued. Not IRAS-certified software.";

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function compactDate(isoDate: string): string {
  return isoDate.replaceAll("-", "");
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function newDocumentNumber(prefix: "INV" | "QUO", date = todayIsoDate()): string {
  const serial = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix}-${compactDate(date)}-${serial}`;
}

export function documentTitle(kind: DocumentKind, gstEnabled: boolean): string {
  if (gstEnabled) return "Tax Invoice";
  return kind === "quote" ? "Quote" : "Invoice";
}

export function documentTitleForTemplate(templateId: TemplateId, gstEnabled: boolean): string {
  return documentTitle(TEMPLATES[templateId].kind, gstEnabled);
}

export function emptyClient() {
  return {
    name: "",
    mobile: "",
    address: "",
    email: "",
  };
}

export function emptySeller() {
  return {
    businessName: "",
    contactName: "",
    mobile: "",
    email: "",
    address: "",
    paynowProxy: "",
    proxyType: "mobile" as const,
    gstRegNo: "",
    logoDataUrl: "",
  };
}

export function newLineId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
