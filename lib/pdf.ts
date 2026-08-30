import type { Template } from "@pdfme/common";
import { documentTitleForTemplate, formatDisplayDate, ISSUED_FOOTER } from "./document";
import { computeTotals, formatSgd, formatSgdPlain, GST_RATE, lineAmount } from "./money";
import { generatePayNowPayload, isValidPayNowPayload, normalizeProxy, PayNowError } from "./paynow";
import type { InvoiceDraft } from "./types";

const INK = "#1b1914";
const MUTED = "#5c564c";
const ACCENT = "#1e4f43";
const LINE = "#d9d0c2";
const PAPER = "#fffdf8";

type CellPad = { top: number; right: number; bottom: number; left: number };

function textField(
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  extras: Record<string, unknown> = {},
) {
  return {
    name,
    type: "text",
    position: { x, y },
    width,
    height,
    fontSize: 10,
    fontColor: INK,
    alignment: "left",
    verticalAlignment: "top",
    lineHeight: 1.25,
    characterSpacing: 0,
    ...extras,
  };
}

function buildTemplate(hasLogo: boolean): Template {
  const schemas = [
    ...(hasLogo
      ? [
          {
            name: "logo",
            type: "image",
            position: { x: 0, y: 0 },
            width: 18,
            height: 18,
          },
        ]
      : []),
    textField("businessName", hasLogo ? 22 : 0, 0, 108, 8, {
      fontSize: 13,
      fontColor: INK,
    }),
    textField("sellerBlock", hasLogo ? 22 : 0, 8.5, 108, 22, {
      fontSize: 8,
      fontColor: MUTED,
      lineHeight: 1.35,
    }),
    textField("docTitle", 118, 0, 64, 10, {
      fontSize: 16,
      alignment: "right",
      fontColor: ACCENT,
    }),
    textField("docMeta", 118, 11, 64, 18, {
      fontSize: 8,
      alignment: "right",
      fontColor: MUTED,
      lineHeight: 1.4,
    }),
    {
      name: "rule",
      type: "line",
      position: { x: 0, y: 34 },
      width: 182,
      height: 0.3,
      color: LINE,
    },
    textField("billToLabel", 0, 38, 90, 5, {
      fontSize: 8,
      fontColor: ACCENT,
    }),
    textField("clientBlock", 0, 43, 90, 22, {
      fontSize: 9,
      fontColor: INK,
      lineHeight: 1.35,
    }),
    textField("payLabel", 100, 38, 82, 5, {
      fontSize: 8,
      fontColor: ACCENT,
      alignment: "right",
    }),
    textField("currencyNote", 100, 43, 82, 10, {
      fontSize: 8,
      fontColor: MUTED,
      alignment: "right",
    }),
    {
      name: "items",
      type: "table",
      position: { x: 0, y: 68 },
      width: 182,
      height: 28,
      showHead: true,
      head: ["Description", "Qty", "Unit price", "Amount"],
      headWidthPercentages: [50, 12, 19, 19],
      tableStyles: {
        borderColor: LINE,
        borderWidth: 0.2,
      },
      headStyles: {
        fontSize: 8,
        characterSpacing: 0,
        alignment: "left",
        verticalAlignment: "middle",
        lineHeight: 1,
        fontColor: PAPER,
        borderColor: ACCENT,
        backgroundColor: ACCENT,
        borderWidth: { top: 0, right: 0, bottom: 0, left: 0 } satisfies CellPad,
        padding: { top: 2.2, right: 2.4, bottom: 2.2, left: 2.4 } satisfies CellPad,
      },
      bodyStyles: {
        fontSize: 8.5,
        characterSpacing: 0,
        alignment: "left",
        verticalAlignment: "middle",
        lineHeight: 1.2,
        fontColor: INK,
        borderColor: LINE,
        backgroundColor: PAPER,
        alternateBackgroundColor: "#f7f1e6",
        borderWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 } satisfies CellPad,
        padding: { top: 2.2, right: 2.4, bottom: 2.2, left: 2.4 } satisfies CellPad,
      },
      columnStyles: {
        alignment: {
          0: "left",
          1: "right",
          2: "right",
          3: "right",
        },
      },
      required: true,
    },
    textField("totals", 100, 100, 82, 22, {
      fontSize: 9,
      alignment: "right",
      fontColor: INK,
      lineHeight: 1.45,
    }),
    textField("notes", 0, 124, 100, 22, {
      fontSize: 8,
      fontColor: MUTED,
      lineHeight: 1.35,
    }),
    textField("paynowHeading", 0, 150, 118, 6, {
      fontSize: 10,
      fontColor: ACCENT,
    }),
    textField("paynowCopy", 0, 157, 118, 28, {
      fontSize: 8,
      fontColor: INK,
      lineHeight: 1.4,
    }),
    {
      name: "paynowQr",
      type: "qrcode",
      position: { x: 132, y: 148 },
      width: 38,
      height: 38,
      backgroundColor: "#ffffff",
      barColor: INK,
      required: true,
    },
    textField("footer", 0, 196, 182, 8, {
      fontSize: 7,
      fontColor: MUTED,
      alignment: "center",
    }),
  ];

  return {
    basePdf: { width: 210, height: 297, padding: [16, 14, 16, 14] },
    schemas: [schemas],
  };
}

function joinLines(lines: Array<string | undefined | null>): string {
  return lines
    .map((line) => (line ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

export function buildPayNowFromDraft(draft: InvoiceDraft) {
  const totals = computeTotals(draft.items, draft.document.gstEnabled);
  const proxy = normalizeProxy(draft.seller.proxyType, draft.seller.paynowProxy);
  const expiry = draft.document.dueDate
    ? draft.document.dueDate.replaceAll("-", "")
    : undefined;

  const payload = generatePayNowPayload({
    proxyType: draft.seller.proxyType,
    proxy: draft.seller.paynowProxy,
    amount: totals.total,
    reference: draft.document.number,
    merchantName: draft.seller.businessName,
    expiry,
  });

  if (!isValidPayNowPayload(payload)) {
    throw new PayNowError(
      "PayNow QR could not be generated. Check the PayNow proxy and try again.",
    );
  }

  return { payload, proxy, totals };
}

export async function generateInvoicePdf(draft: InvoiceDraft): Promise<Uint8Array> {
  const { generate } = await import("@pdfme/generator");
  const { text, image, table, barcodes, line } = await import("@pdfme/schemas");

  const { payload, proxy, totals } = buildPayNowFromDraft(draft);
  const title = documentTitleForTemplate(draft.templateId, draft.document.gstEnabled);
  const hasLogo = Boolean(draft.seller.logoDataUrl);

  const usableItems = draft.items.filter((item) => item.description.trim());
  const rows = usableItems.map((item) => [
    item.description.trim(),
    Number.isFinite(item.quantity) ? String(item.quantity) : "0",
    formatSgd(item.unitPrice),
    formatSgd(lineAmount(item.quantity, item.unitPrice)),
  ]);

  const gstLine = draft.document.gstEnabled
    ? `GST ${(GST_RATE * 100).toFixed(0)}%    ${formatSgd(totals.gst)}`
    : null;

  const inputs: Record<string, string> = {
    businessName: draft.seller.businessName.trim(),
    sellerBlock: joinLines([
      draft.seller.contactName,
      draft.seller.mobile,
      draft.seller.email,
      draft.seller.address,
      draft.document.gstEnabled && draft.seller.gstRegNo.trim()
        ? `GST Reg No ${draft.seller.gstRegNo.trim()}`
        : "",
    ]),
    docTitle: title.toUpperCase(),
    docMeta: joinLines([
      `${title} ${draft.document.number.trim()}`,
      `Date ${formatDisplayDate(draft.document.date)}`,
      draft.document.dueDate ? `Due ${formatDisplayDate(draft.document.dueDate)}` : "",
    ]),
    billToLabel: "BILL TO",
    clientBlock: joinLines([
      draft.client.name,
      draft.client.mobile,
      draft.client.email,
      draft.client.address,
    ]),
    payLabel: "CURRENCY",
    currencyNote: "All amounts in Singapore dollars (SGD).",
    items: JSON.stringify(rows),
    totals: joinLines([
      `Subtotal    ${formatSgd(totals.subtotal)}`,
      gstLine,
      `Total    ${formatSgd(totals.total)}`,
    ]),
    notes: draft.document.notes.trim() ? `Notes\n${draft.document.notes.trim()}` : "",
    paynowHeading: "Pay with PayNow",
    paynowCopy: joinLines([
      "Scan this SGQR with any Singapore bank app. This is not a website link.",
      `PayNow: ${proxy}`,
      `Reference: ${draft.document.number.trim()}`,
      `Amount: S$${formatSgdPlain(totals.total)}`,
    ]),
    paynowQr: payload,
    footer: ISSUED_FOOTER,
  };

  if (hasLogo) {
    inputs.logo = draft.seller.logoDataUrl;
  }

  const pdf = await generate({
    template: buildTemplate(hasLogo),
    inputs: [inputs],
    plugins: {
      text,
      image,
      table,
      line,
      qrcode: barcodes.qrcode,
    },
  });

  return pdf;
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return url;
}
