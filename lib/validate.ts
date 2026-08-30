import { normalizeProxy, PayNowError } from "./paynow";
import type { InvoiceDraft } from "./types";

export type FieldErrors = Partial<Record<string, string>>;

export function validateDraft(draft: InvoiceDraft): FieldErrors {
  const errors: FieldErrors = {};

  if (!draft.seller.businessName.trim()) {
    errors.businessName = "Add your business name.";
  }
  if (!draft.seller.paynowProxy.trim()) {
    errors.paynowProxy = "Add a PayNow mobile or UEN so the QR can be generated.";
  } else {
    try {
      normalizeProxy(draft.seller.proxyType, draft.seller.paynowProxy);
    } catch (error) {
      errors.paynowProxy =
        error instanceof PayNowError ? error.message : "Check the PayNow proxy.";
    }
  }

  if (draft.document.gstEnabled && !draft.seller.gstRegNo.trim()) {
    errors.gstRegNo = "GST is on — add your GST registration number. Issued will not invent one.";
  }

  if (!draft.document.number.trim()) {
    errors.number = "Add a document number.";
  }
  if (!draft.document.date) {
    errors.date = "Add a document date.";
  }

  if (!draft.client.name.trim()) {
    errors.clientName = "Add the client name.";
  }

  const usableItems = draft.items.filter(
    (item) => item.description.trim() && item.quantity > 0 && item.unitPrice >= 0,
  );
  if (usableItems.length === 0) {
    errors.items = "Add at least one line item with a description, quantity, and price.";
  }

  const hasPositive = usableItems.some((item) => item.quantity * item.unitPrice > 0);
  if (usableItems.length > 0 && !hasPositive) {
    errors.items = "Total needs to be above S$0.00 for a PayNow QR with an amount.";
  }

  return errors;
}
