import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { Repository } from "typeorm";
import { Client } from "../entities/client.entity";

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
  ) {}

  async create(name: string): Promise<{ client: Client; apiKey: string }> {
    const apiKey = crypto.randomBytes(32).toString("hex");
    const hashedKey = await bcrypt.hash(apiKey, 10);

    const client = await this.clientsRepository.save(
      this.clientsRepository.create({ name, apiKey: hashedKey }),
    );

    return { client, apiKey };
  }

  async findByApiKey(apiKey: string): Promise<Client | null> {
    const clients = await this.clientsRepository.find();

    for (const client of clients) {
      if (await bcrypt.compare(apiKey, client.apiKey)) {
        return client;
      }
    }

    return null;
  }

  findAll(): Promise<Client[]> {
    return this.clientsRepository.find();
  }
}
