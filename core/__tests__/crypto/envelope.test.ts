import { describe, expect, it } from 'vitest';
import {
  decryptDek,
  decryptField,
  encryptDek,
  encryptField,
  generateDek,
} from '@/lib/crypto/envelope';

describe('envelope encryption', () => {
  describe('DEK lifecycle', () => {
    it('round-trips a DEK through KEK encrypt/decrypt', () => {
      const dek = generateDek();
      const encrypted = encryptDek(dek);
      const decrypted = decryptDek(encrypted);
      expect(decrypted.equals(dek)).toBe(true);
    });

    it('produces different ciphertext for the same DEK each call (random IV)', () => {
      const dek = generateDek();
      const a = encryptDek(dek);
      const b = encryptDek(dek);
      expect(a.equals(b)).toBe(false);
    });

    it('rejects a tampered encrypted DEK', () => {
      const dek = generateDek();
      const encrypted = encryptDek(dek);
      const tampered = Buffer.from(encrypted);
      tampered[encrypted.length - 1] ^= 0xff;
      expect(() => decryptDek(tampered)).toThrow();
    });
  });

  describe('field encryption with DEK', () => {
    it('round-trips a UTF-8 string', () => {
      const dek = generateDek();
      const ciphertext = encryptField('s3cr3t-api-key', dek);
      expect(decryptField(ciphertext, dek)).toBe('s3cr3t-api-key');
    });

    it('round-trips JSON payloads with unicode', () => {
      const dek = generateDek();
      const payload = JSON.stringify({
        apiKey: 'sk-abc123',
        org: 'พชร',
        meta: { region: 'us-east-1' },
      });
      const ciphertext = encryptField(payload, dek);
      expect(decryptField(ciphertext, dek)).toBe(payload);
    });

    it('produces different ciphertext for the same plaintext (random IV)', () => {
      const dek = generateDek();
      const a = encryptField('same-plaintext', dek);
      const b = encryptField('same-plaintext', dek);
      expect(a.equals(b)).toBe(false);
    });

    it('plaintext bytes never appear inside the ciphertext blob', () => {
      const dek = generateDek();
      const plaintext = 'sk-extremely-distinctive-marker-9b2f';
      const ciphertext = encryptField(plaintext, dek);
      expect(ciphertext.toString('utf-8')).not.toContain(plaintext);
    });

    it('rejects a wrong DEK', () => {
      const dekA = generateDek();
      const dekB = generateDek();
      const ciphertext = encryptField('payload', dekA);
      expect(() => decryptField(ciphertext, dekB)).toThrow();
    });

    it('rejects a tampered ciphertext (auth tag mismatch)', () => {
      const dek = generateDek();
      const ciphertext = encryptField('payload', dek);
      const tampered = Buffer.from(ciphertext);
      // Flip a byte in the middle (ciphertext region)
      const mid = Math.floor(tampered.length / 2);
      tampered[mid] ^= 0x01;
      expect(() => decryptField(tampered, dek)).toThrow();
    });

    it('rejects a too-short blob', () => {
      const dek = generateDek();
      expect(() => decryptField(Buffer.alloc(4), dek)).toThrow();
    });
  });
});
