import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { ClientsService } from "./clients.service";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly clientsService: ClientsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers["x-api-key"];

    if (!apiKey || typeof apiKey !== "string") {
      throw new UnauthorizedException("Missing x-api-key header");
    }

    const client = await this.clientsService.findByApiKey(apiKey);
    if (!client) {
      throw new UnauthorizedException("Invalid API key");
    }

    request["client"] = client;
    return true;
  }
}
