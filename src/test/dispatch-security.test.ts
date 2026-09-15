import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import {
  validateInputs,
  validSignature,
} from "../../supabase/functions/_shared/dispatch-inputs";
describe("Backend dispatch input validation", () => {
  it("accepts required false and numeric zero", () => {
    expect(
      validateInputs(
        {
          enabled: { type: "boolean", required: true },
          retries: { type: "number", required: true },
        },
        { enabled: false, retries: "0" },
      ),
    ).toEqual({ enabled: false, retries: 0 });
  });
  it("validates choices, environments, required fields and unknown keys", () => {
    expect(() =>
      validateInputs(
        { target: { type: "choice", options: ["staging"] } },
        { target: "prod" },
      ),
    ).toThrow("Escolha inválida");
    expect(() =>
      validateInputs({ target: { type: "environment" } }, { target: "prod" }, [
        "staging",
      ]),
    ).toThrow("Ambiente inválido");
    expect(() => validateInputs({ spec: { required: true } }, {})).toThrow(
      "Preencha",
    );
    expect(() => validateInputs({}, { token: "x" })).toThrow(
      "Input desconhecido",
    );
  });
  it("rejects malformed booleans and numbers while honoring defaults", () => {
    expect(() =>
      validateInputs({ enabled: { type: "boolean" } }, { enabled: "false" }),
    ).toThrow();
    expect(() =>
      validateInputs({ count: { type: "number" } }, { count: "NaN" }),
    ).toThrow();
    expect(validateInputs({ branch: { default: "main" }, spec: {} })).toEqual({
      branch: "main",
    });
  });
});
describe("GitHub webhook signature", () => {
  it("rejects tampering, wrong secrets and missing signatures", async () => {
    Object.defineProperty(globalThis, "crypto", {
      value: webcrypto,
      configurable: true,
    });
    const raw = '{"action":"completed"}';
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("secret"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const bytes = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)),
    );
    const signature =
      "sha256=" +
      [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(await validSignature(raw, "secret", signature)).toBe(true);
    expect(await validSignature(raw + " ", "secret", signature)).toBe(false);
    expect(await validSignature(raw, "other", signature)).toBe(false);
    expect(await validSignature(raw, "secret", "")).toBe(false);
  });
});
