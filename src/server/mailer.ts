import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { brand } from "@/config/brand";

/**
 * Sends email over SMTP (Gmail / Google Workspace, or any provider). Configure with:
 *   SMTP_HOST (smtp.gmail.com), SMTP_PORT (465), SMTP_USER, SMTP_PASS (a Google "app password"),
 *   optional SMTP_SECURE ("true" for 465, "false" for 587 STARTTLS; defaults from the port) and EMAIL_FROM.
 * Without SMTP_HOST nothing is sent: queued emails simply wait in email_log until it is set.
 */
let cached: { key: string; transport: Transporter } | null = null;

export function mailerConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

export function fromAddress(): string {
  return process.env.EMAIL_FROM || brand.email.from;
}

function transport(): Transporter {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const key = [host, port, secure, user, Boolean(pass)].join("|");
  if (cached?.key === key) return cached.transport;
  const t = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  cached = { key, transport: t };
  return t;
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(mail: Mail): Promise<{ id?: string; error?: string }> {
  if (!mailerConfigured()) return { error: "Email is not set up (SMTP_HOST is empty)." };
  try {
    const info = await transport().sendMail({ from: fromAddress(), to: mail.to, subject: mail.subject, text: mail.text, html: mail.html, replyTo: brand.contact.email });
    return { id: info.messageId };
  } catch (e) {
    return { error: (e as Error).message.slice(0, 300) };
  }
}
