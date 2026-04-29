/**
 * Envelope encryption layer for Nuthatch.
 *
 * Hierarchy:
 *   NUTHATCH_SECRET_KEY (env, ASCII string ≥32 chars)
 *     ↓ HKDF-SHA256(salt='nuthatch-kek-v1', info='kek')
 *   KEK (32 bytes, AES-256 key, derived once at module load)
 *     ↓ AES-256-GCM
 *   DEK (32 random bytes per organization, stored encrypted in organizations.dek_encrypted)
 *     ↓ AES-256-GCM
 *   Field plaintext (e.g. credential JSON)
 *
 * All ciphertexts are framed as: [12 byte IV][N byte ciphertext][16 byte auth tag].
 *
 * Caller contract for plaintext:
 *   - Variables holding plaintext should be scoped narrowly.
 *   - NEVER log, serialize into errors, or persist outside repository code.
 */

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { env } from '@/lib/env';

const KEY_BYTES = 32;            // AES-256
const IV_BYTES = 12;             // 96-bit IV recommended for GCM
const AUTH_TAG_BYTES = 16;
const HKDF_SALT = 'nuthatch-kek-v1';
const HKDF_INFO_KEK = 'kek';

export const KEK_VERSION = 'kek-v1';

let cachedKek: Buffer | null = null;

/**
 * Derive the master KEK from NUTHATCH_SECRET_KEY using HKDF-SHA256.
 * Cached at module scope after first call.
 */
function getKek(): Buffer {
  if (cachedKek) return cachedKek;
  const ikm = Buffer.from(env.NUTHATCH_SECRET_KEY, 'utf-8');
  const salt = Buffer.from(HKDF_SALT, 'utf-8');
  const info = Buffer.from(HKDF_INFO_KEK, 'utf-8');
  const kek = Buffer.from(hkdfSync('sha256', ikm, salt, info, KEY_BYTES));
  cachedKek = kek;
  return kek;
}

/**
 * For tests only — clears the cached KEK so subsequent getKek() re-derives.
 * Useful when tests override NUTHATCH_SECRET_KEY between cases.
 */
export function __resetKekCacheForTests(): void {
  cachedKek = null;
}

function encrypt(plaintext: Buffer, key: Buffer): Buffer {
  if (key.length !== KEY_BYTES) {
    throw new Error(`encrypt: key must be ${KEY_BYTES} bytes`);
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, authTag]);
}

function decrypt(blob: Buffer, key: Buffer): Buffer {
  if (key.length !== KEY_BYTES) {
    throw new Error(`decrypt: key must be ${KEY_BYTES} bytes`);
  }
  if (blob.length < IV_BYTES + AUTH_TAG_BYTES) {
    throw new Error('decrypt: ciphertext blob too short');
  }
  const iv = blob.subarray(0, IV_BYTES);
  const authTag = blob.subarray(blob.length - AUTH_TAG_BYTES);
  const ciphertext = blob.subarray(IV_BYTES, blob.length - AUTH_TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Generate a fresh DEK (32 random bytes). Caller should immediately encrypt
 * with KEK and persist; never store the plaintext DEK.
 */
export function generateDek(): Buffer {
  return randomBytes(KEY_BYTES);
}

/** Encrypt a DEK with the master KEK. Returns the framed blob. */
export function encryptDek(dek: Buffer): Buffer {
  return encrypt(dek, getKek());
}

/** Decrypt a DEK that was encrypted with the master KEK. */
export function decryptDek(encryptedDek: Buffer): Buffer {
  return decrypt(encryptedDek, getKek());
}

/**
 * Encrypt a UTF-8 string field with a per-tenant DEK.
 * The returned Buffer contains [IV ‖ ciphertext ‖ authTag].
 */
export function encryptField(plaintext: string, dek: Buffer): Buffer {
  return encrypt(Buffer.from(plaintext, 'utf-8'), dek);
}

/** Decrypt a field encrypted by encryptField. Throws on tamper / wrong DEK. */
export function decryptField(ciphertext: Buffer, dek: Buffer): string {
  return decrypt(ciphertext, dek).toString('utf-8');
}
