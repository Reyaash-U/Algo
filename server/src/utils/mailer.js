import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter;

function getTransporter() {
  if (!transporter) {
    const config = {
      host: env.SMTP_HOST || 'localhost',
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE, // true for port 465, false for 587
      auth: {
        user: env.SMTP_USER || '',
        pass: env.SMTP_PASS || '',
      },
    };
    transporter = nodemailer.createTransport(config);
  }
  return transporter;
}

/**
 * Sends an email using the SMTP settings from the environment.
 * If SMTP settings are missing, logs the email to the console (mock send)
 * and returns `{ mock: true }` so callers know nothing was delivered.
 *
 * @param {object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.text
 * @param {string} options.html
 * @returns {Promise<any>}
 */
export async function sendEmail({ to, subject, text, html }) {
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    console.log(`[mailer] [MOCK SEND]
To: ${to}
Subject: ${subject}
Text: ${text}
--------------------`);
    return { messageId: 'mock-id', mock: true };
  }

  const mailOptions = {
    from: `"AlgoVault" <${env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  };

  const transport = getTransporter();
  return transport.sendMail(mailOptions);
}
