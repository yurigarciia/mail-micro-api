import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Client } from "./client.entity";

export enum EmailStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
}

@Entity()
export class EmailLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Client, (client) => client.emailLogs)
  client: Client;

  @Column()
  clientId: string;

  @Column("text", { array: true })
  to: string[];

  @Column()
  subject: string;

  @Column({ type: "enum", enum: EmailStatus, default: EmailStatus.PENDING })
  status: EmailStatus;

  @Column({ default: 0 })
  attempts: number;

  @Column({ nullable: true })
  error?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
