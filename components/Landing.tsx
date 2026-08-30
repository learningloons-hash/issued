import Link from "next/link";
import { Wordmark } from "./Brand";
import { ISSUED_FOOTER } from "@/lib/document";
import { TEMPLATE_ORDER, TEMPLATES } from "@/lib/templates";

export function Landing() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark />
        <p className="text-sm text-ink-soft">Singapore · SGD</p>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 sm:px-8">
        <section className="max-w-2xl pt-6 sm:pt-14">
          <p className="text-[0.8rem] font-medium uppercase tracking-[0.16em] text-accent">
            For solo businesses
          </p>
          <h1 className="mt-3 font-display text-[2.35rem] leading-[1.12] tracking-tight text-ink sm:text-6xl">
            Send a proper Singapore invoice in 2 minutes.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
            Quotes and tax invoices with GST and a PayNow QR that bank apps can scan.
            Works in your browser. Nothing is uploaded.
          </p>
        </section>

        <section className="mt-10 grid gap-3 sm:mt-14 sm:grid-cols-3">
          {TEMPLATE_ORDER.map((id) => {
            const template = TEMPLATES[id];
            return (
              <Link
                key={id}
                href={`/create?template=${id}`}
                className="group rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_0_rgba(27,25,20,0.04)] transition hover:-translate-y-0.5 hover:border-accent/40"
              >
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-clay">
                  {template.audience}
                </p>
                <h2 className="mt-2 font-display text-2xl tracking-tight text-ink">
                  {template.name}
                </h2>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                  {template.blurb}
                </p>
                <p className="mt-5 text-sm font-medium text-accent group-hover:underline">
                  Start this template
                </p>
              </Link>
            );
          })}
        </section>

        <section className="mt-10 grid gap-3 rounded-2xl border border-line bg-surface/80 p-5 sm:grid-cols-4 sm:p-6">
          {[
            ["No login", "Seller details stay on this phone."],
            ["GST 9%", "Tax invoice when you need it. No invented GST number."],
            ["PayNow SGQR", "A real EMV QR — not a website link."],
            ["PDF in the browser", "Preview, download, copy WhatsApp text."],
          ].map(([title, copy]) => (
            <div key={title}>
              <h3 className="font-medium text-ink">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{copy}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-line/80 px-5 py-6 text-center text-sm text-ink-soft sm:px-8">
        {ISSUED_FOOTER}
      </footer>
    </div>
  );
}
