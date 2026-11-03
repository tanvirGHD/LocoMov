import test from 'node:test';
import assert from 'node:assert/strict';
import { detectSafetyIssue, getStatusNotificationTargets } from '../src/controllers/chatController.js';

test('detects phone numbers in text messages', () => {
  assert.equal(detectSafetyIssue('Please call me at 01712345678').flagged, true);
  assert.equal(detectSafetyIssue('Please call me at 01712345678').warning, 'For your safety, keep calls and payments inside LocoMuv');
});

test('detects external payment requests', () => {
  const result = detectSafetyIssue('Send me Bkash 01712345678 for the parcel');
  assert.equal(result.flagged, true);
  assert.equal(result.warning, 'For your safety, keep calls and payments inside LocoMuv');
});

test('status notifications only go to the other participant', () => {
  const task = { customerId: 'customer-1', runnerId: 'runner-1' };
  assert.deepEqual(getStatusNotificationTargets(task, 'runner-1'), ['customer-1']);
  assert.deepEqual(getStatusNotificationTargets(task, 'customer-1'), ['runner-1']);
});
