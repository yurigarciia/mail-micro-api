import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

class AttachmentDto {
  @ApiProperty({ example: "relatorio.pdf" })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ description: "Conteúdo do arquivo em base64" })
  @IsString()
  @IsNotEmpty()
  content: string; // base64

  @ApiPropertyOptional({ example: "application/pdf" })
  @IsString()
  @IsOptional()
  contentType?: string;
}

export class SendEmailDto {
  @ApiProperty({ type: [String], example: ["destinatario@exemplo.com"] })
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  to: string[];

  @ApiProperty({ example: "Assunto do e-mail" })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: "Corpo do e-mail (HTML ou texto)", example: "<b>Olá!</b>" })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
