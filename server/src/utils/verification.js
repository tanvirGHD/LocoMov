import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

const secret = () => process.env.OTP_SECRET || process.env.JWT_SECRET;
export const makeCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
export const hashCode = (subject, purpose, code) => crypto.createHmac('sha256', secret()).update(`${subject}:${purpose}:${code}`).digest('hex');
export const codeMatches = (subject, purpose, code, hash) => {
  const actual = Buffer.from(hashCode(subject, purpose, code));
  const expected = Buffer.from(hash || '');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

export async function sendEmailCode(email, code, purpose) {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_FROM) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[DEV] Email verification code for ${email} (${purpose}): ${code}`);
      return;
    }
    throw new Error('Email verification is not configured.');
  }
  try {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: SMTP_SECURE === 'true',
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
    await transport.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: purpose === 'login' ? 'Your LocoMuv sign-in code' : 'Your LocoMuv verification code',
      text: `Your LocoMuv verification code is ${code}. It expires in 5 minutes.`,
    });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[DEV] Email send failed, code for ${email} (${purpose}): ${code}`);
      console.error(err?.message || err);
      return;
    }
    throw err;
  }
}

export async function notifyEmailChange(email, kind) {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_FROM) return;
  const transport = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT || 587), secure: SMTP_SECURE === 'true', auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined });
  await transport.sendMail({ from: SMTP_FROM, to: email, subject: 'Your LocoMuv account was updated', text: `Your account ${kind} was changed. If you did not make this change, contact support.` });
}

export async function sendSmsCode(phone, code) {
  const provider = process.env.SMS_PROVIDER;
  if (!provider || !process.env.SMS_API_URL || !process.env.SMS_API_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.info(`Development phone verification code issued for ${phone.slice(-4)}.`);
      console.info(`Development phone verification code: ${code}`);
      return;
    }
    throw new Error('SMS verification is not configured.');
  }
  const adapter = provider.toLowerCase() === 'ssl_wireless' ? 'ssl_wireless' : provider.toLowerCase() === 'bulksmsbd' ? 'bulksmsbd' : null;
  if (!adapter) throw new Error('Unsupported SMS provider.');
  const body = adapter === 'ssl_wireless'
    ? { api_token: process.env.SMS_API_KEY, sid: process.env.SMS_SENDER_ID, msisdn: phone, sms: `LocoMuv code: ${code}` }
    : { api_key: process.env.SMS_API_KEY, senderid: process.env.SMS_SENDER_ID, number: phone, message: `LocoMuv code: ${code}` };
  const response = await fetch(process.env.SMS_API_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error('SMS delivery failed.');
}

export async function verifyTurnstile(token, ip) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return process.env.NODE_ENV !== 'production';
  if (!token) return false;
  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (ip) body.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const result = await response.json();
  return result.success === true;
}
