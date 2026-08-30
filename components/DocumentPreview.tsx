"use client";

import { documentTitleForTemplate, formatDisplayDate, ISSUED_FOOTER } from "@/lib/document";
import { computeTotals, formatSgd, GST_RATE, lineAmount } from "@/lib/money";
import { TEMPLATES } from "@/lib/templates";
import type { InvoiceDraft } from "@/lib/types";
import { PayNowQr } from "./PayNowQr";

export function DocumentPreview({
  draft,
  paynowPayload,
  paynowProxy,
  qrError,
}: {
  draft: InvoiceDraft;
  paynowPayload: string | null;
  paynowProxy: string;
  qrError: string | null;
}) {
  const title = documentTitleForTemplate(draft.templateId, draft.document.gstEnabled);
  const kind = TEMPLATES[draft.templateId].kind;
  const totals = computeTotals(draft.items, draft.document.gstEnabled);
  const items = draft.items.filter((item) => item.description.trim());

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_12px_40px_rgba(27,25,20,0.06)]">
      <div className="border-b border-line bg-paper-deep/50 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">
        Preview
      </div>
      <div className="space-y-5 p-4 sm:p-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {draft.seller.logoDataUrl ? (
              // Logo is a local data URL; next/image is not useful here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.seller.logoDataUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-md border border-line bg-white object-contain"
              />
            ) : null}
            <div className="min-w-0">
              <p className="font-display text-xl leading-tight text-ink">
                {draft.seller.businessName.trim() || "Your business"}
              </p>
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-ink-soft">
                {[
                  draft.seller.contactName,
                  draft.seller.mobile,
                  draft.seller.email,
                  draft.seller.address,
                  draft.document.gstEnabled && draft.seller.gstRegNo.trim()
                    ? `GST Reg No ${draft.seller.gstRegNo.trim()}`
                    : "",
                ]
                  .filter(Boolean)
                  .join("\n") || "Seller details appear here."}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-lg tracking-tight text-accent">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              {kind === "quote" && !draft.document.gstEnabled ? "Quote" : "Invoice"}{" "}
              {draft.document.number || "—"}
              <br />
              Date {formatDisplayDate(draft.document.date)}
              {draft.document.dueDate ? (
                <>
                  <br />
                  Due {formatDisplayDate(draft.document.dueDate)}
                </>
              ) : null}
            </p>
          </div>
        </header>

        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-accent">
            Bill to
          </p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">
            {[draft.client.name, draft.client.mobile, draft.client.email, draft.client.address]
              .filter(Boolean)
              .join("\n") || "Client details appear here."}
          </p>
        </div>

        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="bg-accent text-left text-xs uppercase tracking-[0.08em] text-surface">
                <th className="px-2.5 py-2 font-medium">Description</th>
                <th className="px-2.5 py-2 text-right font-medium">Qty</th>
                <th className="px-2.5 py-2 text-right font-medium">Unit price</th>
                <th className="px-2.5 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(items.length
                ? items
                : [{ id: "empty", description: "—", quantity: 0, unitPrice: 0 }]
              ).map((item) => (
                <tr key={item.id} className="border-b border-line">
                  <td className="px-2.5 py-2">{item.description}</td>
                  <td className="px-2.5 py-2 text-right">{item.quantity || "—"}</td>
                  <td className="px-2.5 py-2 text-right">{formatSgd(item.unitPrice)}</td>
                  <td className="px-2.5 py-2 text-right">
                    {formatSgd(lineAmount(item.quantity, item.unitPrice))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto w-full max-w-[16rem] space-y-1 text-sm">
          <div className="flex justify-between gap-6 text-ink-soft">
            <span>Subtotal</span>
            <span>{formatSgd(totals.subtotal)}</span>
          </div>
          {draft.document.gstEnabled ? (
            <div className="flex justify-between gap-6 text-ink-soft">
              <span>GST {(GST_RATE * 100).toFixed(0)}%</span>
              <span>{formatSgd(totals.gst)}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-6 font-medium text-ink">
            <span>Total</span>
            <span>{formatSgd(totals.total)}</span>
          </div>
        </div>

        {draft.document.notes.trim() ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            <span className="font-medium text-ink">Notes. </span>
            {draft.document.notes.trim()}
          </p>
        ) : null}

        <div className="flex flex-col gap-4 border-t border-line pt-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-medium text-accent">Pay with PayNow</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Scan this SGQR with any Singapore bank app. This is not a website link.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              PayNow: {paynowProxy || "—"}
              <br />
              Reference: {draft.document.number || "—"}
              <br />
              Amount: {formatSgd(totals.total)}
            </p>
          </div>
          <PayNowQr payload={paynowPayload} error={qrError} />
        </div>

        <p className="text-center text-[0.7rem] text-ink-soft">{ISSUED_FOOTER}</p>
      </div>
    </article>
  );
}
