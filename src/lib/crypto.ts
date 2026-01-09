// Encryption utilities for secure API key storage
// Uses Web Crypto API with AES-GCM for authenticated encryption

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_ITERATIONS = 100000;

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: KEY_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: string, passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoder.encode(plaintext)
  );

  // Combine salt + iv + ciphertext into single array
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(ciphertext: string, passphrase: string): Promise<string> {
  const decoder = new TextDecoder();
  
  // Decode base64
  const combined = new Uint8Array(
    atob(ciphertext).split('').map(c => c.charCodeAt(0))
  );

  // Extract salt, iv, and encrypted data
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(passphrase, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encrypted
  );

  return decoder.decode(decrypted);
}

export function isPassphraseSet(): boolean {
  return sessionStorage.getItem('_pk_unlocked') === 'true';
}

export function setPassphraseUnlocked(unlocked: boolean): void {
  if (unlocked) {
    sessionStorage.setItem('_pk_unlocked', 'true');
  } else {
    sessionStorage.removeItem('_pk_unlocked');
    sessionStorage.removeItem('_pk');
  }
}

// Store passphrase temporarily in session (cleared on tab close)
export function cachePassphrase(passphrase: string): void {
  sessionStorage.setItem('_pk', btoa(passphrase));
  sessionStorage.setItem('_pk_unlocked', 'true');
}

export function getCachedPassphrase(): string | null {
  const encoded = sessionStorage.getItem('_pk');
  return encoded ? atob(encoded) : null;
}
