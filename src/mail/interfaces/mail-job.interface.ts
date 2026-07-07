export interface MailJobAttachment {
  filename: string;
  content: string; // base64
  contentType?: string;
}

export interface MailJob {
  emailLogId: string;
  to: string[];
  subject: string;
  body: string;
  attachments?: MailJobAttachment[];
}
