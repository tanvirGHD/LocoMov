import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';

function key() {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('OTP_SECRET অথবা JWT_SECRET কনফিগার করা নেই');
  return createHash('sha256').update('ParaSync OTP encryption key v1:').update(secret).digest();
}

export function createOtp() {
  return String(randomInt(1000, 10000));
}

export function encryptOtp(otp) {
  const ivBuffer = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), ivBuffer);
  const ciphertext = Buffer.concat([cipher.update(otp, 'utf8'), cipher.final()]);
  return [ivBuffer.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptOtp(encrypted) {
  const [iv, tag, ciphertext] = encrypted.split('.');
  if (!iv || !tag || !ciphertext) throw new Error('OTP তথ্যটি সঠিক নয়');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function verifyOtp(encrypted, candidate) {
  const expected = Buffer.from(decryptOtp(encrypted));
  const actual = Buffer.from(candidate);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
