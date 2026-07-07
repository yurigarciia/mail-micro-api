import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiProperty, ApiResponse, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { AdminKeyGuard } from "./admin-key.guard";
import { ClientsService } from "./clients.service";

class CreateClientDto {
  @ApiProperty({ example: "Meu App Mobile" })
  @IsString()
  @IsNotEmpty()
  name: string;
}

@ApiTags("clients")
@ApiSecurity("x-admin-key")
@Controller("clients")
@UseGuards(AdminKeyGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiResponse({
    status: 201,
    description: "Cliente criado com API key gerada",
    schema: {
      example: {
        id: "<uuid-do-cliente>",
        name: "Meu App Mobile",
        apiKey: "<api-key-gerada-guarde-com-cuidado>",
        warning: "Guarde essa API key agora, ela não será mostrada novamente.",
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "Admin key ausente ou inválida",
    schema: {
      example: {
        message: "Invalid admin key",
        error: "Unauthorized",
        statusCode: 401,
      },
    },
  })
  async create(@Body() dto: CreateClientDto) {
    const { client, apiKey } = await this.clientsService.create(dto.name);
    return {
      id: client.id,
      name: client.name,
      apiKey,
      warning: "Guarde essa API key agora, ela não será mostrada novamente.",
    };
  }

  @Get()
  @ApiResponse({
    status: 200,
    description: "Lista de clientes cadastrados",
    schema: {
      example: [
        {
          id: "<uuid-do-cliente>",
          name: "Meu App Mobile",
          apiKey: "$2b$10$<hash-bcrypt-da-api-key>",
          createdAt: "2026-07-07T20:39:57.000Z",
        },
      ],
    },
  })
  findAll() {
    return this.clientsService.findAll();
  }
}
