/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

const textEncoder = new TextEncoder();

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

export const verifySignedSpin = async ({ serialized, signature, secret }) => {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signed = await crypto.subtle.sign("HMAC", key, textEncoder.encode(serialized));
  return toHex(signed) === signature;
};
