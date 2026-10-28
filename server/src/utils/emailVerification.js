import crypto from 'node:crypto';
import { escapeHtml } from './digestSchedule.js';

export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // verification links last 24h

// The raw token only ever travels in the email link; the DB stores its hash,
// so a leaked database can't be used to verify arbitrary accounts.
export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function createVerificationToken(now = new Date()) {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + VERIFY_TTL_MS),
  };
}

export function buildVerificationEmail({ displayName, appUrl, token }) {
  const url = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = 'Verify your AlgoVault email';
  const text =
    `Hi ${displayName},\n\nPlease confirm this email address to start receiving revision reminders:\n\n${url}\n\n` +
    `The link expires in 24 hours. If you didn't create an AlgoVault account, you can ignore this email.\n\n- The AlgoVault Team`;
  const html =
    `<p>Hi ${escapeHtml(displayName)},</p>` +
    `<p>Please confirm this email address to start receiving revision reminders:</p>` +
    `<p><a href="${escapeHtml(url)}">Verify my email</a></p>` +
    `<p style="color:#666;font-size:12px">The link expires in 24 hours. If you didn't create an AlgoVault account, ignore this email.</p>`;
  return { subject, text, html };
}
