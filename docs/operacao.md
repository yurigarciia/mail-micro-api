# Operação

Runbook para operar o serviço em produção: variáveis de ambiente, gestão de clientes/API keys, e o que observar no dia a dia.

## Variáveis de ambiente

| Variável         | Obrigatória | Descrição                                                        |
| ---------------- | ----------- | ------------------------------------------------------------------ |
| `DATABASE_URL`   | Sim         | Connection string do PostgreSQL (ex: Neon)                        |
| `SMTP_HOST`      | Sim         | Host SMTP (ex: `smtp.mailgun.org`)                                 |
| `SMTP_PORT`      | Sim         | Porta SMTP (`587` para STARTTLS)                                   |
| `SMTP_USER`      | Sim         | Usuário/remetente SMTP                                             |
| `SMTP_PASSWORD`  | Sim         | Senha SMTP                                                          |
| `ADMIN_KEY`      | Sim         | Chave usada para autenticar `POST /clients` e `GET /clients`       |
| `PORT`           | Não         | Porta HTTP da aplicação (definida automaticamente pelo Render)     |

Nenhuma dessas variáveis deve ser commitada — `.env` está no `.gitignore`. Em produção (Render), são configuradas diretamente no painel do serviço.

## Gestão de clientes (API keys)

### Criar um novo cliente

```bash
curl -X POST https://<host>/clients \
  -H "x-admin-key: <ADMIN_KEY>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Nome da aplicação" }'
```

A resposta contém a `apiKey` em texto puro **uma única vez**. Se for perdida, não há como recuperá-la — é necessário criar um novo cliente (não há endpoint de rotação/regeneração hoje).

### Listar clientes

```bash
curl https://<host>/clients -H "x-admin-key: <ADMIN_KEY>"
```

Retorna todos os clientes cadastrados (com o hash bcrypt da API key, não a key original).

### Revogar acesso de um cliente

Não há endpoint de exclusão/desativação implementado ainda. Para revogar hoje, é necessário remover o registro diretamente no banco (tabela `client`). Se isso se tornar uma necessidade recorrente, vale adicionar `DELETE /clients/:id`.

## Monitorando envios

Cada tentativa de envio gera um registro na tabela `email_log`, com `status` (`PENDING`, `SENT`, `FAILED`), `attempts` e `error` (mensagem da última falha, se houver).

Consulta útil para investigar problemas:

```sql
SELECT id, "clientId", to, subject, status, attempts, error, "createdAt"
FROM email_log
WHERE status = 'FAILED'
ORDER BY "createdAt" DESC
LIMIT 20;
```

## Logs da aplicação

A fila (`MailQueueService`) loga via `Logger` do Nest:

- `warn` a cada tentativa de retry (`Falha ao enviar e-mail <id> (tentativa N), retry em Xms: <erro>`)
- `error` quando um e-mail esgota as tentativas e é marcado como `FAILED`

Ausência de logs de warn/error para um envio geralmente indica sucesso na primeira tentativa.

## Cenários comuns

**SMTP retornando erro de autenticação**
Verifique se `SMTP_USER`/`SMTP_PASSWORD` ainda são válidos no provedor (Mailgun). Credenciais SMTP podem ser revogadas/alteradas independentemente da API key do Mailgun usada em outros lugares.

**Falha de conexão com o banco (Neon)**
Bancos serverless como o Neon podem hibernar após inatividade — a primeira conexão após um período ocioso pode demorar alguns segundos. Isso é esperado e não indica um problema de configuração.

**Processo reiniciado com jobs pendentes**
Como a fila é em memória (veja [Arquitetura](./arquitetura.md)), jobs que estavam aguardando retry no momento de um restart são perdidos — o `EmailLog` correspondente fica parado em `PENDING` com o `attempts` da última tentativa registrada. Não há reprocessamento automático desses casos hoje.

## Deploy

Veja a seção de deploy no [README principal](../README.md#deploy) — o serviço usa `Dockerfile` + `render.yaml` para deploy no Render como Web Service (processo long-running).
