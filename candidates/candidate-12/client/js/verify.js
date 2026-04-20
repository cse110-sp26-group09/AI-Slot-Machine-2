/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

function stableStringify(input) {
  if (Array.isArray(input)) {
    return `[${input.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (input && typeof input === 'object') {
    const keys = Object.keys(input).sort();
    const content = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(input[key])}`).join(',');
    return `{${content}}`;
  }

  return JSON.stringify(input);
}

function base64UrlToBytes(base64UrlValue) {
  const normalized = base64UrlValue.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(paddingLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64Url(bytes) {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function importHmacKey(base64UrlValue) {
  const keyData = base64UrlToBytes(base64UrlValue);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function signPayload(payload, secret) {
  const key = await importHmacKey(secret);
  const encoder = new TextEncoder();
  const message = encoder.encode(stableStringify(payload));
  const signature = await crypto.subtle.sign('HMAC', key, message);
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function verifyResultSignature(resultPayload, signature, verificationKey) {
  const expected = await signPayload(resultPayload, verificationKey);
  return expected === signature;
}

export function createSignedRequestPayload(method, path, bodyPayload) {
  const nonceArray = new Uint8Array(16);
  crypto.getRandomValues(nonceArray);
  const nonce = bytesToBase64Url(nonceArray);
  const timestamp = Date.now();

  return {
    method,
    path,
    ts: timestamp,
    nonce,
    body: bodyPayload
  };
}

export async function createRequestSignature(signedPayload, requestKey) {
  return signPayload(signedPayload, requestKey);
}
