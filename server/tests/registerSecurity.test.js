import assert from 'node:assert';
import { isValidImageMagicBytes } from '../src/controllers/authController.js';

console.log('--- Testing Register Security & Validations ---');

// 1. Test Magic Bytes Image Verification
// Valid JPEG magic bytes (starts with FF D8 FF)
const validJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01]);
assert.strictEqual(isValidImageMagicBytes(validJpeg), true, 'Valid JPEG header should be accepted');

// Valid PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)
const validPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
assert.strictEqual(isValidImageMagicBytes(validPng), true, 'Valid PNG header should be accepted');

// Valid WebP magic bytes (RIFF .... WEBP)
const validWebp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
assert.strictEqual(isValidImageMagicBytes(validWebp), true, 'Valid WebP header should be accepted');

// Invalid file / fake extension (e.g. PHP script or random text)
const maliciousFile = Buffer.from('<?php echo "evil script"; ?>');
assert.strictEqual(isValidImageMagicBytes(maliciousFile), false, 'PHP script payload must be rejected');

const fakeJpg = Buffer.from('NOT_AN_IMAGE_FILE_BUFFER');
assert.strictEqual(isValidImageMagicBytes(fakeJpg), false, 'Fake image must be rejected');

assert.strictEqual(isValidImageMagicBytes(null), false, 'Null buffer must be rejected');
assert.strictEqual(isValidImageMagicBytes(Buffer.from([])), false, 'Empty buffer must be rejected');

console.log('✓ Magic bytes image verification passed!');

console.log('--- All Registration Security Tests Passed! ---');

