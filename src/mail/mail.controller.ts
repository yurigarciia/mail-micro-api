import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import { ApiResponse, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import type { Request } from "express";
import { ApiKeyGuard } from "../auth/api-key.guard";
import { Client } from "../entities/client.entity";
import { SendEmailDto } from "./dto/send-email.dto";
import { MailService } from "./mail.service";

@ApiTags("emails")
@ApiSecurity("x-api-key")
@Controller("emails")
@UseGuards(ApiKeyGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: "E-mail aceito e enfileirado para envio em background",
    schema: {
      example: {
        id: "<uuid-do-envio>",
        status: "queued",
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "API key ausente ou inválida",
    schema: {
      example: {
        message: "Invalid API key",
        error: "Unauthorized",
        statusCode: 401,
      },
    },
  })
  async send(@Body() dto: SendEmailDto, @Req() request: Request) {
    const client = request["client"] as Client;
    const emailLog = await this.mailService.enqueue(client.id, dto);
    return { id: emailLog.id, status: "queued" };
  }
}
