"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function PayNowQr({
  payload,
  error,
  size = 168,
}: {
  payload: string | null;
  error: string | null;
  size?: number;
}) {
  const [qr, setQr] = useState<{ payload: string; src: string } | null>(null);

  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: size * 2,
      color: { dark: "#1b1914", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQr({ payload, src: url });
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  const src = qr && payload && qr.payload === payload ? qr.src : null;

  if (error) {
    return (
      <div className="rounded-xl border border-bad/30 bg-bad/5 p-3 text-sm leading-relaxed text-bad">
        {error}
      </div>
    );
  }

  if (!payload || !src) {
    return (
      <div className="flex aspect-square w-full max-w-[168px] items-center justify-center rounded-xl border border-dashed border-line bg-paper text-center text-xs leading-relaxed text-ink-soft">
        PayNow QR appears when the form is complete.
      </div>
    );
  }

  return (
    // QR is a generated data URL, not a hosted asset.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="PayNow SGQR for this document"
      width={size}
      height={size}
      className="h-auto w-full max-w-[168px] rounded-lg border border-line bg-white p-1"
    />
  );
}
