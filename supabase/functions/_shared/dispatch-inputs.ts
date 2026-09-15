export interface InputSpec {
  type?: string;
  required?: boolean;
  default?: string | boolean | number;
  options?: string[];
}
export function validateInputs(
  specs: Record<string, InputSpec>,
  submitted: Record<string, unknown> = {},
  environments: string[] = [],
) {
  const inputs: Record<string, string | boolean | number> = {};
  for (const key of Object.keys(submitted))
    if (!(key in specs)) throw new Error(`Input desconhecido: ${key}.`);
  for (const [key, spec] of Object.entries(specs)) {
    const value =
      submitted[key] ?? spec.default ?? (spec.type === "boolean" ? false : "");
    if (spec.required && value === "") throw new Error(`Preencha ${key}.`);
    if (!["string", "boolean", "number"].includes(typeof value))
      throw new Error(`Valor inválido em ${key}.`);
    if (spec.type === "boolean" && typeof value !== "boolean")
      throw new Error(`Valor inválido em ${key}.`);
    if (spec.type === "choice" && !spec.options?.includes(String(value)))
      throw new Error(`Escolha inválida em ${key}.`);
    if (
      spec.type === "environment" &&
      value !== "" &&
      !environments.includes(String(value))
    )
      throw new Error(`Ambiente inválido em ${key}.`);
    if (
      spec.type === "number" &&
      (value === "" ||
        typeof value === "boolean" ||
        !Number.isFinite(Number(value)))
    )
      throw new Error(`Número inválido em ${key}.`);
    if (value === "" && !spec.required) continue;
    inputs[key] =
      spec.type === "number"
        ? Number(value)
        : (value as string | boolean | number);
  }
  return inputs;
}
export async function validSignature(
  raw: string,
  secret: string,
  provided: string,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)),
  );
  const expected =
    "sha256=" +
    [...signature].map((b) => b.toString(16).padStart(2, "0")).join("");
  let difference = expected.length ^ provided.length;
  for (let i = 0; i < expected.length; i++)
    difference |= expected.charCodeAt(i) ^ (provided.charCodeAt(i) || 0);
  return difference === 0;
}
