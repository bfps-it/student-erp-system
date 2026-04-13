const CryptoJS = require('crypto-js');
const logger = require('./logger');

/**
 * BFPS ERP - AES-256 Encryption Utility
 * Used for: Aadhaar numbers, PAN numbers, bank account details.
 * Key: ENCRYPTION_KEY from environment (must be 32 characters).
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  logger.error('ENCRYPTION_KEY is not set! Sensitive data encryption will fail.');
}

/**
 * Encrypt a plaintext string using AES-256
 * @param {string} plaintext - Text to encrypt
 * @returns {string} Encrypted ciphertext (Base64)
 */
function encrypt(plaintext) {
  if (!plaintext) return null;
  if (!ENCRYPTION_KEY) {
    logger.warn('ENCRYPTION_KEY not set. Returning plaintext (development only).');
    return plaintext;
  }

  try {
    return CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY).toString();
  } catch (error) {
    logger.error(`Encryption error: ${error.message}`);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a ciphertext string using AES-256
 * @param {string} ciphertext - Text to decrypt (Base64)
 * @returns {string} Decrypted plaintext
 */
function decrypt(ciphertext) {
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
    logger.error(`Decryption error: ${error.message}`);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Mask a value for display purposes
 * Shows only last N characters.
 *
 * @param {string} value - Value to mask
 * @param {number} visibleChars - Number of visible chars at end (default: 4)
 * @returns {string} Masked value (e.g., 'XXXX XXXX 1234')
 */
function maskValue(value, visibleChars = 4) {
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

/**
 * Encrypt and mask Aadhaar number
 * @param {string} aadhaar - 12-digit Aadhaar number
 * @returns {{ encrypted: string, masked: string }}
 */
function encryptAadhaar(aadhaar) {
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
 * @param {string} pan - 10-character PAN
 * @returns {{ encrypted: string, masked: string }}
 */
function encryptPAN(pan) {
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
 * @param {string} accountNo - Bank account number
 * @returns {{ encrypted: string, masked: string }}
 */
function encryptBankAccount(accountNo) {
  if (!accountNo) return { encrypted: null, masked: null };

  return {
    encrypted: encrypt(accountNo.trim()),
    masked: maskValue(accountNo.trim()),
  };
}

module.exports = {
  encrypt,
  decrypt,
  maskValue,
  encryptAadhaar,
  encryptPAN,
  encryptBankAccount,
};
