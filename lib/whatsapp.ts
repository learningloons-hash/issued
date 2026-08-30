import { documentTitleForTemplate } from "./document";
import { formatSgd } from "./money";
import type { InvoiceDraft, Totals } from "./types";

export function buildWhatsAppText(
  draft: InvoiceDraft,
  totals: Totals,
  paynowProxy: string,
): string {
  const title = documentTitleForTemplate(draft.templateId, draft.document.gstEnabled);
  const number = draft.document.number.trim() || "—";
  const client = draft.client.name.trim();
  const greeting = client ? `Hi ${client},` : "Hi,";
  const proxy = paynowProxy.trim() || "—";

  return [
    `${greeting} here is my ${title.toLowerCase()} ${number} for ${formatSgd(totals.total)}.`,
    "",
    `PayNow: ${proxy}`,
    `Reference: ${number}`,
    "",
    "Thank you.",
    "— Sent with Issued",
  ].join("\n");
}

export async function copyText(text: string): Promise<"copied" | "fallback"> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
    throw new Error("Clipboard API unavailable");
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    area.style.top = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok ? "copied" : "fallback";
  }
}
