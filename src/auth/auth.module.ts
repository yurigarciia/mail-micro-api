import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Client } from "../entities/client.entity";
import { AdminKeyGuard } from "./admin-key.guard";
import { ApiKeyGuard } from "./api-key.guard";
import { ClientsController } from "./clients.controller";
import { ClientsService } from "./clients.service";

@Module({
  imports: [TypeOrmModule.forFeature([Client])],
  controllers: [ClientsController],
  providers: [ClientsService, ApiKeyGuard, AdminKeyGuard],
  exports: [ClientsService, ApiKeyGuard],
})
export class AuthModule {}
