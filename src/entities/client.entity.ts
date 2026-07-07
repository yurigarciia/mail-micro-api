import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { EmailLog } from "./email-log.entity";

@Entity()
export class Client {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  apiKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => EmailLog, (log) => log.client)
  emailLogs: EmailLog[];
}
