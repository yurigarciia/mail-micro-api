import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailLog, EmailStatus } from "../entities/email-log.entity";
import { MailJob } from "./interfaces/mail-job.interface";
import { MailerService } from "./mailer.service";

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 2000;

@Injectable()
export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);
  private readonly queue: MailJob[] = [];
  private processing = false;

  constructor(
    private readonly mailerService: MailerService,
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
  ) {}

  enqueue(job: MailJob): void {
    this.queue.push(job);
    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      await this.processJob(job);
    }

    this.processing = false;
  }

  private async processJob(job: MailJob): Promise<void> {
    try {
      await this.mailerService.send(job);
      await this.emailLogRepository.update(job.emailLogId, {
        status: EmailStatus.SENT,
      });
    } catch (error) {
      const emailLog = await this.emailLogRepository.findOneBy({ id: job.emailLogId });
      const attempts = (emailLog?.attempts ?? 0) + 1;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (attempts < MAX_ATTEMPTS) {
        await this.emailLogRepository.update(job.emailLogId, { attempts, error: errorMessage });
        const delay = BASE_BACKOFF_MS * attempts;
        this.logger.warn(
          `Falha ao enviar e-mail ${job.emailLogId} (tentativa ${attempts}), retry em ${delay}ms: ${errorMessage}`,
        );
        setTimeout(() => this.enqueue(job), delay);
      } else {
        await this.emailLogRepository.update(job.emailLogId, {
          status: EmailStatus.FAILED,
          attempts,
          error: errorMessage,
        });
        this.logger.error(`E-mail ${job.emailLogId} falhou definitivamente: ${errorMessage}`);
      }
    }
  }
}
