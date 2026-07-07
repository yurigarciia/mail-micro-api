import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { MailJob } from "./interfaces/mail-job.interface";

@Injectable()
export class MailerService {
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // port 587 uses STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  async send(job: MailJob): Promise<void> {
    await this.transporter.sendMail({
      from: `South Inovations Systems <${process.env.SMTP_USER}>`,
      to: job.to,
      subject: job.subject,
      html: job.body,
      text: stripHtml(job.body),
      attachments: job.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content, "base64"),
        contentType: attachment.contentType,
      })),
    });
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
