import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  crc16CcittFalse,
  generatePayNowPayload,
  isValidPayNowPayload,
  normalizeMobile,
  normalizeUen,
  PayNowError,
} from "./paynow.ts";

describe("PayNow SGQR", () => {
  it("normalizes Singapore mobiles to +65", () => {
    assert.equal(normalizeMobile("91234567"), "+6591234567");
    assert.equal(normalizeMobile("+65 9123 4567"), "+6591234567");
    assert.equal(normalizeMobile("6591234567"), "+6591234567");
    assert.equal(normalizeMobile("091234567"), "+6591234567");
  });

  it("does not prefix UEN with +65", () => {
    assert.equal(normalizeUen("201234567A"), "201234567A");
    assert.equal(normalizeUen(" t08ll0001b "), "T08LL0001B");
  });

  it("builds a bank-scannable EMV payload, not a URL", () => {
    const payload = generatePayNowPayload({
      proxyType: "mobile",
      proxy: "91234567",
      amount: 128,
      reference: "INV-20260830-042",
      merchantName: "Lee Tuition",
      expiry: "20261128",
    });

    assert.ok(payload.startsWith("000201"));
    assert.ok(payload.includes("SG.PAYNOW"));
    assert.ok(payload.includes("+6591234567"));
    assert.ok(payload.includes("INV-20260830-042"));
    assert.ok(payload.includes("128.00"));
    assert.ok(!payload.includes("http"));
    assert.ok(isValidPayNowPayload(payload));
  });

  it("encodes UEN proxies without +65", () => {
    const payload = generatePayNowPayload({
      proxyType: "uen",
      proxy: "201234567A",
      amount: 80.5,
      reference: "QUO-20260830-111",
      merchantName: "Sparkle Clean",
      expiry: "20261128",
    });

    assert.ok(payload.includes("SG.PAYNOW"));
    assert.ok(payload.includes("201234567A"));
    assert.ok(!payload.includes("+65201234567A"));
    assert.match(payload, /01012/);
    assert.ok(isValidPayNowPayload(payload));
  });

  it("rejects empty proxies", () => {
    assert.throws(
      () =>
        generatePayNowPayload({
          proxyType: "mobile",
          proxy: "",
          amount: 10,
          reference: "INV-1",
          merchantName: "Test",
        }),
      PayNowError,
    );
  });

  it("CRC-16/CCITT-FALSE matches a known vector", () => {
    assert.equal(crc16CcittFalse("123456789"), "29B1");
  });
});
