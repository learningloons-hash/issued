import type { LineItem, Totals } from "./types";

export const GST_RATE = 0.09;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineAmount(quantity: number, unitPrice: number): number {
  const qty = Number.isFinite(quantity) ? quantity : 0;
  const price = Number.isFinite(unitPrice) ? unitPrice : 0;
  return roundMoney(qty * price);
}

export function computeTotals(items: LineItem[], gstEnabled: boolean): Totals {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + lineAmount(item.quantity, item.unitPrice), 0),
  );
  const gst = gstEnabled ? roundMoney(subtotal * GST_RATE) : 0;
  return {
    subtotal,
    gst,
    total: roundMoney(subtotal + gst),
  };
}

export function formatSgd(value: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatSgdPlain(value: number): string {
  return (Number.isFinite(value) ? value : 0).toFixed(2);
}
