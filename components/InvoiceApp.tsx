"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Wordmark } from "./Brand";
import { DocumentPreview } from "./DocumentPreview";
import {
  emptyClient,
  ISSUED_FOOTER,
  newDocumentNumber,
  newLineId,
  todayIsoDate,
} from "@/lib/document";
import { readLogoFile } from "@/lib/logo";
import { computeTotals, formatSgd, lineAmount } from "@/lib/money";
import { buildPayNowFromDraft, downloadPdf, generateInvoicePdf } from "@/lib/pdf";
import { PayNowError } from "@/lib/paynow";
import { loadSeller, saveSeller } from "@/lib/storage";
import { TEMPLATES, TEMPLATE_ORDER } from "@/lib/templates";
import type { InvoiceDraft, LineItem, Seller, TemplateId } from "@/lib/types";
import { validateDraft, type FieldErrors } from "@/lib/validate";
import { buildWhatsAppText, copyText } from "@/lib/whatsapp";

function itemsFromTemplate(templateId: TemplateId): LineItem[] {
  return TEMPLATES[templateId].defaultItems.map((item) => ({
    ...item,
    id: newLineId(),
  }));
}

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function createDraft(templateId: TemplateId, seller: Seller): InvoiceDraft {
  const template = TEMPLATES[templateId];
  return {
    templateId,
    seller,
    client: emptyClient(),
    document: {
      number: newDocumentNumber(template.numberPrefix),
      date: todayIsoDate(),
      dueDate: "",
      notes: template.defaultNotes,
      gstEnabled: false,
    },
    items: itemsFromTemplate(templateId),
  };
}

export function InvoiceApp({ initialTemplateId }: { initialTemplateId: TemplateId }) {
  const isClient = useIsClient();
  const [draft, setDraft] = useState<InvoiceDraft | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<"pdf" | "whatsapp" | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [whatsApp, setWhatsApp] = useState<{
    text: string;
    status: "copied" | "fallback";
  } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  if (isClient && draft === null) {
    setDraft(createDraft(initialTemplateId, loadSeller()));
  }

  const sellerToPersist = draft?.seller;
  useEffect(() => {
    if (!sellerToPersist) return;
    saveSeller(sellerToPersist);
  }, [sellerToPersist]);

  const totals = useMemo(
    () => (draft ? computeTotals(draft.items, draft.document.gstEnabled) : computeTotals([], false)),
    [draft],
  );

  const liveQr = useMemo(() => {
    if (!draft) {
      return { payload: null, proxy: "", error: null as string | null };
    }
    try {
      const result = buildPayNowFromDraft(draft);
      return { payload: result.payload, proxy: result.proxy, error: null as string | null };
    } catch (error) {
      const readyEnough =
        Boolean(draft.seller.paynowProxy.trim()) &&
        totals.total > 0 &&
        Boolean(draft.document.number.trim());
      return {
        payload: null,
        proxy: draft.seller.paynowProxy.trim(),
        error: readyEnough && error instanceof PayNowError ? error.message : null,
      };
    }
  }, [draft, totals.total]);

  function updateSeller<K extends keyof Seller>(key: K, value: Seller[K]) {
    setDraft((current) =>
      current
        ? {
            ...current,
            seller: { ...current.seller, [key]: value },
          }
        : current,
    );
  }

  function switchTemplate(templateId: TemplateId) {
    if (!draft || templateId === draft.templateId) return;
    const template = TEMPLATES[templateId];
    setDraft((current) =>
      current
        ? {
            ...current,
            templateId,
            client: emptyClient(),
            items: itemsFromTemplate(templateId),
            document: {
              ...current.document,
              number: newDocumentNumber(template.numberPrefix),
              notes: template.defaultNotes,
            },
          }
        : current,
    );
    setErrors({});
    setWhatsApp(null);
    setPdfUrl(null);
    setBanner(null);
  }

  function updateItem(id: string, patch: Partial<LineItem>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
          }
        : current,
    );
  }

  async function onLogo(file: File | null) {
    setLogoError(null);
    if (!file) {
      updateSeller("logoDataUrl", "");
      return;
    }
    try {
      updateSeller("logoDataUrl", await readLogoFile(file));
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : "Could not use that logo.");
    }
  }

  function patchDraft(updater: (current: InvoiceDraft) => InvoiceDraft) {
    setDraft((current) => (current ? updater(current) : current));
  }

  function readyOrShowErrors() {
    if (!draft) return false;
    const next = validateDraft(draft);
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onDownloadPdf() {
    if (!draft) return;
    if (!readyOrShowErrors()) {
      setBanner("Please fix the highlighted fields before generating the PDF.");
      return;
    }
    setBusy("pdf");
    setBanner(null);
    try {
      const bytes = await generateInvoicePdf(draft);
      const name = `${draft.document.number.trim() || "issued"}.pdf`;
      const url = downloadPdf(bytes, name);
      setPdfUrl(url);
    } catch (error) {
      const message =
        error instanceof PayNowError
          ? error.message
          : "The PDF could not be generated. Check the form and try again.";
      setBanner(message);
    } finally {
      setBusy(null);
    }
  }

  async function onCopyWhatsApp() {
    if (!draft) return;
    if (!readyOrShowErrors()) {
      setBanner("Please fix the highlighted fields before copying WhatsApp text.");
      return;
    }
    setBusy("whatsapp");
    setBanner(null);
    try {
      const { proxy } = buildPayNowFromDraft(draft);
      const text = buildWhatsAppText(draft, totals, proxy);
      const status = await copyText(text);
      setWhatsApp({ text, status });
    } catch (error) {
      const text = buildWhatsAppText(draft, totals, draft.seller.paynowProxy.trim());
      setWhatsApp({ text, status: "fallback" });
      setBanner(
        error instanceof PayNowError
          ? error.message
          : "WhatsApp text is ready below — copy it manually if needed.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (!draft) {
    return (
      <div className="flex min-h-full flex-col">
        <header className="border-b border-line/80 px-4 py-3 sm:px-6">
          <Wordmark size="sm" />
        </header>
        <p className="px-4 py-10 text-ink-soft">Loading Issued…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Wordmark size="sm" />
            <span className="hidden text-sm text-ink-soft sm:inline">Create</span>
          </div>
          <Link href="/" className="text-sm text-ink-soft underline-offset-2 hover:underline">
            All templates
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start">
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            void onDownloadPdf();
          }}
        >
          <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <h1 className="font-display text-2xl tracking-tight">Choose a template</h1>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {TEMPLATE_ORDER.map((id) => {
                const selected = draft.templateId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => switchTemplate(id)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                      selected
                        ? "border-accent bg-accent text-surface"
                        : "border-line bg-paper hover:border-accent/40"
                    }`}
                  >
                    <span className="block font-medium">{TEMPLATES[id].name}</span>
                    <span className={selected ? "text-surface/80" : "text-ink-soft"}>
                      {TEMPLATES[id].kind === "quote" ? "Quote" : "Invoice"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              Switching templates clears the client and line items. Your seller details stay.
            </p>
          </section>

          <Section title="Your business" hint="Saved on this device only.">
            <Field label="Business name" error={errors.businessName}>
              <input
                value={draft.seller.businessName}
                onChange={(event) => updateSeller("businessName", event.target.value)}
                autoComplete="organization"
                className={inputClass(errors.businessName)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact name">
                <input
                  value={draft.seller.contactName}
                  onChange={(event) => updateSeller("contactName", event.target.value)}
                  autoComplete="name"
                  className={inputClass()}
                />
              </Field>
              <Field label="Mobile">
                <input
                  value={draft.seller.mobile}
                  onChange={(event) => updateSeller("mobile", event.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  className={inputClass()}
                />
              </Field>
            </div>
            <Field label="Email">
              <input
                type="email"
                value={draft.seller.email}
                onChange={(event) => updateSeller("email", event.target.value)}
                autoComplete="email"
                className={inputClass()}
              />
            </Field>
            <Field label="Address">
              <textarea
                value={draft.seller.address}
                onChange={(event) => updateSeller("address", event.target.value)}
                rows={2}
                className={inputClass()}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <Field label="Proxy type">
                <select
                  value={draft.seller.proxyType}
                  onChange={(event) =>
                    updateSeller("proxyType", event.target.value === "uen" ? "uen" : "mobile")
                  }
                  className={inputClass()}
                >
                  <option value="mobile">Mobile</option>
                  <option value="uen">UEN</option>
                </select>
              </Field>
              <Field
                label={draft.seller.proxyType === "uen" ? "PayNow UEN" : "PayNow mobile"}
                error={errors.paynowProxy}
              >
                <input
                  value={draft.seller.paynowProxy}
                  onChange={(event) => updateSeller("paynowProxy", event.target.value)}
                  placeholder={draft.seller.proxyType === "uen" ? "201234567A" : "91234567"}
                  className={inputClass(errors.paynowProxy)}
                />
              </Field>
            </div>
            <Field label="Logo (optional)">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void onLogo(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-paper-deep file:px-3 file:py-2 file:text-sm file:text-ink"
              />
              {draft.seller.logoDataUrl ? (
                <button
                  type="button"
                  onClick={() => updateSeller("logoDataUrl", "")}
                  className="mt-2 text-sm text-ink-soft underline"
                >
                  Remove logo
                </button>
              ) : null}
              {logoError ? <p className="mt-1 text-sm text-bad">{logoError}</p> : null}
            </Field>
          </Section>

          <Section title="GST" hint="When GST is on, the PDF is labelled Tax Invoice.">
            <label className="flex items-start gap-3 rounded-xl border border-line bg-paper px-3 py-3">
              <input
                type="checkbox"
                checked={draft.document.gstEnabled}
                onChange={(event) =>
                  patchDraft((current) => ({
                    ...current,
                    document: { ...current.document, gstEnabled: event.target.checked },
                  }))
                }
                className="mt-1 h-4 w-4 accent-accent"
              />
              <span>
                <span className="block font-medium">Charge GST 9%</span>
                <span className="text-sm text-ink-soft">
                  Off: this stays a {TEMPLATES[draft.templateId].kind === "quote" ? "quote" : "invoice"}.
                  Issued will not invent a GST number.
                </span>
              </span>
            </label>
            {draft.document.gstEnabled ? (
              <Field label="GST registration number" error={errors.gstRegNo}>
                <input
                  value={draft.seller.gstRegNo}
                  onChange={(event) => updateSeller("gstRegNo", event.target.value)}
                  placeholder="e.g. 201234567A"
                  className={inputClass(errors.gstRegNo)}
                />
              </Field>
            ) : null}
          </Section>

          <Section title="Document">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Number" error={errors.number}>
                <input
                  value={draft.document.number}
                  onChange={(event) =>
                    patchDraft((current) => ({
                      ...current,
                      document: { ...current.document, number: event.target.value },
                    }))
                  }
                  className={inputClass(errors.number)}
                />
              </Field>
              <Field label="Date" error={errors.date}>
                <input
                  type="date"
                  value={draft.document.date}
                  onChange={(event) =>
                    patchDraft((current) => ({
                      ...current,
                      document: { ...current.document, date: event.target.value },
                    }))
                  }
                  className={inputClass(errors.date)}
                />
              </Field>
              <Field label="Due date (optional)">
                <input
                  type="date"
                  value={draft.document.dueDate}
                  onChange={(event) =>
                    patchDraft((current) => ({
                      ...current,
                      document: { ...current.document, dueDate: event.target.value },
                    }))
                  }
                  className={inputClass()}
                />
              </Field>
            </div>
            <Field label="Notes (optional)">
              <textarea
                value={draft.document.notes}
                onChange={(event) =>
                  patchDraft((current) => ({
                    ...current,
                    document: { ...current.document, notes: event.target.value },
                  }))
                }
                rows={3}
                className={inputClass()}
              />
            </Field>
          </Section>

          <Section title="Client" hint="Client details are not saved.">
            <Field label="Client name" error={errors.clientName}>
              <input
                value={draft.client.name}
                onChange={(event) =>
                  patchDraft((current) => ({
                    ...current,
                    client: { ...current.client, name: event.target.value },
                  }))
                }
                className={inputClass(errors.clientName)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mobile (optional)">
                <input
                  value={draft.client.mobile}
                  onChange={(event) =>
                    patchDraft((current) => ({
                      ...current,
                      client: { ...current.client, mobile: event.target.value },
                    }))
                  }
                  inputMode="tel"
                  className={inputClass()}
                />
              </Field>
              <Field label="Email (optional)">
                <input
                  type="email"
                  value={draft.client.email}
                  onChange={(event) =>
                    patchDraft((current) => ({
                      ...current,
                      client: { ...current.client, email: event.target.value },
                    }))
                  }
                  className={inputClass()}
                />
              </Field>
            </div>
            <Field label="Address (optional)">
              <textarea
                value={draft.client.address}
                onChange={(event) =>
                  patchDraft((current) => ({
                    ...current,
                    client: { ...current.client, address: event.target.value },
                  }))
                }
                rows={2}
                className={inputClass()}
              />
            </Field>
          </Section>

          <Section title="Line items" hint="Amounts in SGD, 2 decimals.">
            {errors.items ? <p className="text-sm text-bad">{errors.items}</p> : null}
            <div className="space-y-3">
              {draft.items.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-line bg-paper p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
                      Item {index + 1}
                    </p>
                    {draft.items.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          patchDraft((current) => ({
                            ...current,
                            items: current.items.filter((row) => row.id !== item.id),
                          }))
                        }
                        className="text-sm text-ink-soft underline"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <Field label="Description">
                    <input
                      value={item.description}
                      onChange={(event) => updateItem(item.id, { description: event.target.value })}
                      className={inputClass()}
                    />
                  </Field>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Field label="Qty">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={Number.isFinite(item.quantity) ? item.quantity : ""}
                        onChange={(event) =>
                          updateItem(item.id, { quantity: Number(event.target.value) })
                        }
                        className={inputClass()}
                      />
                    </Field>
                    <Field label="Unit price">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={Number.isFinite(item.unitPrice) ? item.unitPrice : ""}
                        onChange={(event) =>
                          updateItem(item.id, { unitPrice: Number(event.target.value) })
                        }
                        className={inputClass()}
                      />
                    </Field>
                    <Field label="Amount">
                      <p className="flex h-11 items-center text-sm">{formatSgd(lineAmount(item.quantity, item.unitPrice))}</p>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                patchDraft((current) => ({
                  ...current,
                  items: [
                    ...current.items,
                    { id: newLineId(), description: "", quantity: 1, unitPrice: 0 },
                  ],
                }))
              }
              className="text-sm font-medium text-accent underline-offset-2 hover:underline"
            >
              Add a line
            </button>
            <div className="space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal</span>
                <span>{formatSgd(totals.subtotal)}</span>
              </div>
              {draft.document.gstEnabled ? (
                <div className="flex justify-between text-ink-soft">
                  <span>GST 9%</span>
                  <span>{formatSgd(totals.gst)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatSgd(totals.total)}</span>
              </div>
            </div>
          </Section>

          {banner ? (
            <p className="rounded-xl border border-bad/30 bg-bad/5 px-3 py-2 text-sm text-bad">
              {banner}
            </p>
          ) : null}

          <div className="sticky bottom-3 z-10 grid gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur sm:grid-cols-2">
            <button
              type="submit"
              disabled={busy === "pdf"}
              className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-surface hover:bg-accent-hover disabled:opacity-60"
            >
              {busy === "pdf" ? "Generating PDF…" : "Download PDF"}
            </button>
            <button
              type="button"
              disabled={busy === "whatsapp"}
              onClick={() => void onCopyWhatsApp()}
              className="rounded-xl border border-line bg-paper px-4 py-3 text-sm font-medium hover:border-accent/40 disabled:opacity-60"
            >
              {busy === "whatsapp" ? "Copying…" : "Copy WhatsApp text"}
            </button>
            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-center text-sm text-accent underline sm:col-span-2"
              >
                Open generated PDF
              </a>
            ) : null}
          </div>

          {whatsApp ? (
            <section className="rounded-2xl border border-accent/30 bg-surface p-4">
              <p className="font-medium text-accent">
                {whatsApp.status === "copied"
                  ? "WhatsApp text copied."
                  : "Clipboard was blocked — copy the text below."}
              </p>
              <textarea
                readOnly
                value={whatsApp.text}
                className={`${inputClass()} mt-3 min-h-36`}
                onFocus={(event) => event.currentTarget.select()}
              />
            </section>
          ) : null}
        </form>

        <aside className="lg:sticky lg:top-20">
          <DocumentPreview
            draft={draft}
            paynowPayload={liveQr.payload}
            paynowProxy={liveQr.proxy}
            qrError={liveQr.error}
          />
        </aside>
      </main>

      <footer className="px-4 py-6 text-center text-sm text-ink-soft">{ISSUED_FOOTER}</footer>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div>
        <h2 className="font-display text-xl tracking-tight">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-ink-soft">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink-soft">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-bad">{error}</span> : null}
    </label>
  );
}

function inputClass(error?: string) {
  return `w-full rounded-xl border bg-paper px-3 py-2.5 text-base text-ink outline-none focus:border-accent ${
    error ? "border-bad" : "border-line"
  }`;
}
