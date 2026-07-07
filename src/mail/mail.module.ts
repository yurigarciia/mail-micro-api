import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { EmailLog } from "../entities/email-log.entity";
import { MailController } from "./mail.controller";
import { MailQueueService } from "./mail-queue.service";
import { MailService } from "./mail.service";
import { MailerService } from "./mailer.service";

@Module({
  imports: [TypeOrmModule.forFeature([EmailLog]), AuthModule],
  controllers: [MailController],
  providers: [MailService, MailQueueService, MailerService],
})
export class MailModule {}
