import { Injectable } from "@nestjs/common";
import FormData from "form-data";
import Mailgun from "mailgun.js";
import { MailJob } from "./interfaces/mail-job.interface";

const mailgun = new Mailgun(FormData);

@Injectable()
export class MailerService {
  private readonly client = mailgun.client({
    username: "api",
    key: process.env.MAILGUN_API_KEY!,
  });

  async send(job: MailJob): Promise<void> {
    await this.client.messages.create(process.env.MAILGUN_DOMAIN!, {
      from: `South Inovations Systems <${process.env.MAILGUN_FROM}>`,
      to: job.to,
      subject: job.subject,
      html: job.body,
      text: stripHtml(job.body),
      attachment: job.attachments?.map((attachment) => ({
        filename: attachment.filename,
        data: Buffer.from(attachment.content, "base64"),
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
