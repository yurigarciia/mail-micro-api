import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailLog } from "../entities/email-log.entity";
import { SendEmailDto } from "./dto/send-email.dto";
import { MailQueueService } from "./mail-queue.service";

@Injectable()
export class MailService {
  constructor(
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
    private readonly mailQueueService: MailQueueService,
  ) {}

  async enqueue(clientId: string, dto: SendEmailDto): Promise<EmailLog> {
    const emailLog = await this.emailLogRepository.save(
      this.emailLogRepository.create({
        clientId,
        to: dto.to,
        subject: dto.subject,
      }),
    );

    this.mailQueueService.enqueue({
      emailLogId: emailLog.id,
      to: dto.to,
      subject: dto.subject,
      body: dto.body,
      attachments: dto.attachments,
    });

    return emailLog;
  }
}
