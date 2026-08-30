import type { ProxyType } from "./types";

export class PayNowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayNowError";
  }
}

export type PayNowInput = {
  proxyType: ProxyType;
  proxy: string;
  amount: number;
  reference: string;
  merchantName: string;
  expiry?: string;
};

function tlv(id: string, value: string): string {
  if (value.length > 99) {
    throw new PayNowError(`PayNow field ${id} is too long.`);
  }
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF). Used by EMV QR / SGQR. */
export function crc16CcittFalse(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code > 255) {
      throw new PayNowError("PayNow payload must be ASCII.");
    }
    crc ^= code << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function normalizeMobile(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new PayNowError("Enter a PayNow mobile number.");
  }

  const compact = trimmed.replace(/[\s-]/g, "");
  let digits: string;

  if (compact.startsWith("+65")) {
    digits = compact.slice(3).replace(/\D/g, "");
  } else if (compact.startsWith("65") && compact.replace(/\D/g, "").length >= 10) {
    digits = compact.replace(/\D/g, "").slice(2);
  } else {
    digits = compact.replace(/\D/g, "");
    if (digits.startsWith("65") && digits.length === 10) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0") && digits.length === 9) {
      digits = digits.slice(1);
    }
  }

  if (!/^\d{8}$/.test(digits)) {
    throw new PayNowError(
      "Enter a Singapore mobile number for PayNow — 8 digits, or with +65.",
    );
  }

  return `+65${digits}`;
}

export function normalizeUen(raw: string): string {
  const uen = raw.trim().replace(/\s+/g, "").toUpperCase();
  if (!/^[0-9A-Z]{8,15}$/.test(uen)) {
    throw new PayNowError("Enter a valid UEN for PayNow.");
  }
  return uen;
}

export function normalizeProxy(proxyType: ProxyType, proxy: string): string {
  return proxyType === "mobile" ? normalizeMobile(proxy) : normalizeUen(proxy);
}

function defaultExpiry(): string {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 90);
  const year = expiry.getFullYear();
  const month = String(expiry.getMonth() + 1).padStart(2, "0");
  const day = String(expiry.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function sanitizeMerchantName(name: string): string {
  const ascii = name
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
  return (ascii || "NA").slice(0, 25);
}

function sanitizeReference(reference: string): string {
  const ascii = reference
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
  if (!ascii) {
    throw new PayNowError("Add a document number so PayNow can include a reference.");
  }
  return ascii.slice(0, 25);
}

/**
 * Build a merchant-presented PayNow SGQR payload (EMV).
 * Bank apps scan this string — it is not a URL.
 */
export function generatePayNowPayload(input: PayNowInput): string {
  const proxy = normalizeProxy(input.proxyType, input.proxy);
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new PayNowError("Add at least one line item with a total above S$0.00.");
  }

  const amount = input.amount.toFixed(2);
  const reference = sanitizeReference(input.reference);
  const merchantName = sanitizeMerchantName(input.merchantName);
  const expiry = /^\d{8}$/.test(input.expiry ?? "") ? input.expiry! : defaultExpiry();

  const merchantAccount = [
    tlv("00", "SG.PAYNOW"),
    tlv("01", input.proxyType === "mobile" ? "0" : "2"),
    tlv("02", proxy),
    tlv("03", "0"),
    tlv("04", expiry),
  ].join("");

  const additional = tlv("01", reference);

  const body = [
    tlv("00", "01"),
    tlv("01", "12"),
    tlv("26", merchantAccount),
    tlv("52", "0000"),
    tlv("53", "702"),
    tlv("54", amount),
    tlv("58", "SG"),
    tlv("59", merchantName),
    tlv("60", "Singapore"),
    tlv("62", additional),
  ].join("");

  const withCrcHeader = `${body}6304`;
  return `${withCrcHeader}${crc16CcittFalse(withCrcHeader)}`;
}

export function isValidPayNowPayload(payload: string): boolean {
  if (!payload.startsWith("000201")) return false;
  if (!payload.includes("SG.PAYNOW")) return false;
  if (!payload.endsWith(payload.slice(-4))) return false;
  if (payload.length < 30) return false;
  const crc = payload.slice(-4);
  const data = payload.slice(0, -4);
  if (!data.endsWith("6304")) return false;
  return crc16CcittFalse(data) === crc;
}
