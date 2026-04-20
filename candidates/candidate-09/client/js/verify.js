/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

const encoder = new TextEncoder();

const toHex = (arrayBuffer) =>
  [...new Uint8Array(arrayBuffer)].map((value) => value.toString(16).padStart(2, "0")).join("");

const importHmacKey = async (rawKey) =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(rawKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

const stableStringify = (value) => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const parts = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${parts.join(",")}}`;
};

const signWithHmac = async (secret, payload) => {
  const key = await importHmacKey(secret);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(signatureBuffer);
};

const signRequestBody = async ({ requestSigningKey, body, requestCounter }) => {
  const timestamp = Date.now().toString();
  const canonicalBody = stableStringify(body ?? {});
  const payload = `${timestamp}.${canonicalBody}.${requestCounter + 1}`;
  const signature = await signWithHmac(requestSigningKey, payload);
  return { timestamp, signature };
};

const verifySpinPayloadSignature = async ({ spinVerificationKey, payload }) => {
  const { signature, ...unsignedPayload } = payload;
  if (!signature) {
    return false;
  }
  const expected = await signWithHmac(spinVerificationKey, stableStringify(unsignedPayload));
  return signature === expected;
};

export { signRequestBody, verifySpinPayloadSignature };
