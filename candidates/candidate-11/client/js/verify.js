const textEncoder = new TextEncoder();

const base64UrlToUint8Array = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

export const importClientVerifyKey = async (base64UrlKey) => {
  const rawKey = base64UrlToUint8Array(base64UrlKey);
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["verify"]
  );
};

export const verifySignedPayload = async ({ signedPayload, signature, key }) => {
  const payloadBytes = textEncoder.encode(signedPayload);
  const signatureBytes = base64UrlToUint8Array(signature);

  const isValid = await crypto.subtle.verify("HMAC", key, signatureBytes, payloadBytes);

  if (!isValid) {
    throw new Error("Invalid payload signature");
  }

  return JSON.parse(signedPayload);
};
