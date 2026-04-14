import CryptoJS from 'crypto-js';
import logger from './logger';

/**
 * BFPS ERP - AES-256 Encryption Utility (TypeScript)
 * Used for: Aadhaar numbers, PAN numbers, bank account details.
 * Key: ENCRYPTION_KEY from environment (must be 32 characters).
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  logger.error('ENCRYPTION_KEY is not set! Sensitive data encryption will fail.');
}

/**
 * Encrypt a plaintext string using AES-256
 * @param plaintext - Text to encrypt
 * @returns Encrypted ciphertext (Base64)
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  if (!ENCRYPTION_KEY) {
    logger.warn('ENCRYPTION_KEY not set. Returning plaintext (development only).');
    return plaintext;
  }

  try {
    return CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY).toString();
  } catch (error) {
    logger.error(`Encryption error: ${(error as Error).message}`);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a ciphertext string using AES-256
 * @param ciphertext - Text to decrypt (Base64)
 * @returns Decrypted plaintext
 */
export function decrypt(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  if (!ENCRYPTION_KEY) {
    logger.warn('ENCRYPTION_KEY not set. Returning ciphertext as-is (development only).');
    return ciphertext;
  }

  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error('Decryption produced empty result');
    }

    return decrypted;
  } catch (error) {
    logger.error(`Decryption error: ${(error as Error).message}`);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Mask a value for display purposes
 * Shows only last N characters.
 *
 * @param value - Value to mask
 * @param visibleChars - Number of visible chars at end (default: 4)
 * @returns Masked value (e.g., 'XXXX XXXX 1234')
 */
export function maskValue(value: string | null | undefined, visibleChars = 4): string | null {
  if (!value) return null;

  const cleanValue = value.replace(/\s/g, '');
  if (cleanValue.length <= visibleChars) return cleanValue;

  const masked = 'X'.repeat(cleanValue.length - visibleChars) + cleanValue.slice(-visibleChars);

  // Format Aadhaar-style: XXXX XXXX 1234
  if (cleanValue.length === 12) {
    return `${masked.slice(0, 4)} ${masked.slice(4, 8)} ${masked.slice(8)}`;
  }

  return masked;
}

export interface EncryptedData {
  encrypted: string | null;
  masked: string | null;
}

/**
 * Encrypt and mask Aadhaar number
 * @param aadhaar - 12-digit Aadhaar number
 */
export function encryptAadhaar(aadhaar: string | null | undefined): EncryptedData {
  if (!aadhaar) return { encrypted: null, masked: null };

  const clean = aadhaar.replace(/\s|-/g, '');
  if (clean.length !== 12 || !/^\d{12}$/.test(clean)) {
    throw new Error('Invalid Aadhaar number format');
  }

  return {
    encrypted: encrypt(clean),
    masked: maskValue(clean),
  };
}

/**
 * Encrypt PAN number
 * @param pan - 10-character PAN
 */
export function encryptPAN(pan: string | null | undefined): EncryptedData {
  if (!pan) return { encrypted: null, masked: null };

  const clean = pan.toUpperCase().trim();
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(clean)) {
    throw new Error('Invalid PAN format');
  }

  return {
    encrypted: encrypt(clean),
    masked: maskValue(clean),
  };
}

/**
 * Encrypt bank account number
 * @param accountNo - Bank account number
 */
export function encryptBankAccount(accountNo: string | null | undefined): EncryptedData {
  if (!accountNo) return { encrypted: null, masked: null };

  return {
    encrypted: encrypt(accountNo.trim()),
    masked: maskValue(accountNo.trim()),
  };
}
