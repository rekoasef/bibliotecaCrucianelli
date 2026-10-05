import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

let transporter: Transporter | undefined;

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = env();
  if (!SMTP_HOST) return undefined;
  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ?? 587,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

export async function sendMail(mail: Mail) {
  const smtp = getTransporter();

  // Sin SMTP configurado: en desarrollo el mail se muestra en la consola.
  if (!smtp) {
    if (env().NODE_ENV === "production" && !env().MAIL_TO_CONSOLE) {
      throw new Error("SMTP no configurado: no se pueden enviar mails.");
    }
    console.info(
      `\n── Mail (sin SMTP) ──\nPara: ${mail.to}\nAsunto: ${mail.subject}\n\n${mail.text}\n────────────────────\n`,
    );
    return;
  }

  await smtp.sendMail({ from: env().SMTP_FROM, ...mail });
}
