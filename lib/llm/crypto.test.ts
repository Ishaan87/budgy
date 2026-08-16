import { beforeAll, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, last4 } from "./crypto";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
});

describe("crypto", () => {
  it("round-trips a plaintext secret", () => {
    const secret = encryptSecret("sk-or-v1-abcdef1234567890");
    expect(decryptSecret(secret)).toBe("sk-or-v1-abcdef1234567890");
  });

  it("produces a different ciphertext/iv each time", () => {
    const a = encryptSecret("same-plaintext");
    const b = encryptSecret("same-plaintext");
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });

  it("throws when the auth tag has been tampered with", () => {
    const secret = encryptSecret("sk-or-v1-abcdef1234567890");
    const tampered = { ...secret, authTag: encryptSecret("other").authTag };
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws when the ciphertext has been tampered with", () => {
    const secret = encryptSecret("sk-or-v1-abcdef1234567890");
    const tamperedBytes = Buffer.from(secret.ciphertext, "base64");
    tamperedBytes[0] ^= 0xff;
    const tampered = { ...secret, ciphertext: tamperedBytes.toString("base64") };
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("extracts the last 4 characters for display", () => {
    expect(last4("sk-or-v1-abcdef1234567890")).toBe("7890");
  });
});
