# Mail Micro API

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)
![NestJS](https://img.shields.io/badge/built%20with-NestJS-e0234e.svg)
![TypeScript](https://img.shields.io/badge/lang-TypeScript-3178c6.svg)

Microsserviço de envio de e-mail transacional, construído para ser reutilizado por múltiplas aplicações (web, mobile, backends de terceiros) sem duplicar lógica de envio de e-mail em cada projeto.

Cada aplicação cliente recebe uma API key própria e envia requisições de e-mail de forma **fire-and-forget**: a API responde imediatamente e o envio é processado em background, com retries automáticos em caso de falha.

## Stack

- [NestJS](https://nestjs.com/) + TypeScript
- [TypeORM](https://typeorm.io/) + PostgreSQL
- [Mailgun](https://www.mailgun.com/) (API HTTP, via `mailgun.js`)
- [Swagger](https://swagger.io/) para documentação interativa da API

## Arquitetura

```
Cliente (app externo)
   │  POST /emails  (header x-api-key)
   ▼
ApiKeyGuard ──► valida API key contra Client no banco
   ▼
MailController ──► MailService ──► grava EmailLog (PENDING) + enfileira job
   ▼                                        │
202 Accepted (resposta imediata)            ▼
                                    MailQueueService (fila em memória)
                                             │
                                             ▼
                                     MailerService (Mailgun API HTTP)
                                             │
                              sucesso ──► EmailLog.status = SENT
                              falha   ──► retry (até 3x, backoff) ou FAILED
```

A fila é **em memória**: simples e sem dependências externas (Redis, etc.), mas os jobs pendentes se perdem se o processo reiniciar. Aceitável para o volume de uso atual — se isso deixar de ser verdade, migrar para uma fila persistente (BullMQ + Redis, por exemplo) é o próximo passo natural.

Detalhes completos das decisões de design em [`docs/arquitetura.md`](./docs/arquitetura.md).

## Endpoints

Documentação interativa completa disponível em `/swagger` após subir a aplicação.

| Método | Rota       | Autenticação  | Descrição                                    |
| ------ | ---------- | ------------- | --------------------------------------------- |
| POST   | `/clients` | `x-admin-key` | Cria um cliente e gera sua API key            |
| GET    | `/clients` | `x-admin-key` | Lista os clientes cadastrados                 |
| POST   | `/emails`  | `x-api-key`   | Enfileira o envio de um e-mail                |

### Exemplo — enviar um e-mail

```bash
curl -X POST https://<host>/emails \
  -H "x-api-key: <api-key-do-cliente>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["destinatario@exemplo.com"],
    "subject": "Assunto do e-mail",
    "body": "<b>Olá!</b> Corpo em HTML.",
    "attachments": [
      { "filename": "arquivo.pdf", "content": "<base64>", "contentType": "application/pdf" }
    ]
  }'
```

Resposta (`202 Accepted`):

```json
{ "id": "<uuid-do-envio>", "status": "queued" }
```

## Documentação

Índice completo em [`/docs`](./docs/README.md). Guias disponíveis:

- [Guia de Implantação](./docs/guia-de-implantacao.md) — como aplicações terceiras integram esta API para enviar e-mails.
- [Arquitetura](./docs/arquitetura.md) — visão técnica interna, fluxo da fila e decisões de design.
- [Operação](./docs/operacao.md) — variáveis de ambiente, gestão de clientes/API keys, monitoramento.
- [Troubleshooting](./docs/troubleshooting.md) — problemas comuns e como resolver.

## Configuração local

### Pré-requisitos

- Node.js 20+
- Uma instância PostgreSQL acessível (local ou gerenciada, ex: [Neon](https://neon.tech/))

### Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
MAILGUN_API_KEY=sua-api-key-do-mailgun
MAILGUN_DOMAIN=seu-dominio-verificado.com
MAILGUN_FROM=remetente@seu-dominio-verificado.com
ADMIN_KEY=uma-chave-forte-para-gerenciar-clientes
PORT=3000
```

### Instalação e execução

```bash
npm install

# desenvolvimento (watch mode)
npm run start:dev

# build de produção
npm run build
npm run start:prod
```

A aplicação sobe em `http://localhost:3000`, com a documentação em `http://localhost:3000/swagger`.

## Deploy

O projeto inclui `Dockerfile` e `render.yaml` prontos para deploy no [Render](https://render.com/) como Web Service (processo long-running, necessário pela fila em memória). Basta conectar o repositório e preencher as variáveis de ambiente no painel.

## Licença

[MIT](./LICENSE)
