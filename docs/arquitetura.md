# Arquitetura

Visão técnica interna do projeto — como as peças se encaixam e por quê. Para o guia de uso da API por serviços terceiros, veja o [Guia de Implantação](./guia-de-implantacao.md).

## Visão geral

```
Cliente (app externo)
   │  POST /emails  (header x-api-key)
   ▼
ApiKeyGuard ──► valida API key contra Client no banco (bcrypt.compare)
   ▼
MailController ──► MailService.enqueue()
                       │
                       ├─► grava EmailLog (status = PENDING)
                       └─► MailQueueService.enqueue(job)
   ▼
202 Accepted (resposta imediata, "fire-and-forget")

                                    [em background]
                            MailQueueService processa a fila
                                       │
                                       ▼
                              MailerService.send(job)
                                (Mailgun API HTTP)
                                       │
                    sucesso ──────────┼────────── falha
                       │                              │
              EmailLog.status = SENT          attempts++ , retry com backoff
                                               (até 3x) ou status = FAILED
```

## Módulos

| Módulo  | Responsabilidade                                                        |
| ------- | ------------------------------------------------------------------------ |
| `auth`  | `Client` (entidade), `ClientsService`/`ClientsController` (CRUD admin), `ApiKeyGuard`, `AdminKeyGuard` |
| `mail`  | `SendEmailDto`, `MailController`, `MailService`, `MailQueueService`, `MailerService` |

## Decisões de design e trade-offs

### Fila em memória (não Redis/BullMQ)

A fila roda dentro do próprio processo Node (`MailQueueService`), sem dependência externa.

- **Vantagem:** zero infraestrutura adicional, simples de rodar e deployar.
- **Trade-off aceito:** jobs pendentes (aguardando retry) se perdem se o processo reiniciar ou crashar no meio do processamento. Para o volume de uso atual (uso pessoal/pequenos clientes), esse risco foi considerado aceitável.
- **Quando reconsiderar:** se o volume de envios crescer, se falhas de entrega silenciosas se tornarem um problema recorrente, ou se for necessário rodar múltiplas instâncias da API (a fila em memória não é compartilhada entre processos) — nesse ponto, migrar para BullMQ + Redis é o caminho natural, sem precisar mudar a interface pública da API.

### TypeORM em vez de Prisma

Escolha do usuário por familiaridade/preferência com TypeORM. `synchronize: true` está habilitado (schema sincronizado automaticamente a partir das entidades) — adequado para o estágio atual do projeto, mas **não recomendado** se o projeto crescer e precisar de migrations controladas/versionadas em produção com múltiplos ambientes.

### Autenticação simples por header (`x-api-key` / `x-admin-key`)

Sem JWT, sem expiração, sem escopos granulares — API keys estáticas comparadas via hash bcrypt.

- **Vantagem:** simples de integrar em qualquer linguagem/stack cliente, sem fluxo de autenticação complexo.
- **Trade-off aceito:** revogação de acesso é binária (existe ou não existe o cliente no banco) — não há expiração automática nem rotação forçada. Adequado para uso interno/poucos clientes confiáveis.

### Anexos via base64 no JSON (não multipart)

Facilita integração de qualquer cliente HTTP sem lidar com `multipart/form-data`, ao custo de payloads maiores (base64 é ~33% maior que o binário original) — por isso o guia de implantação recomenda evitar anexos muito grandes por esse caminho.

### Versão texto automática (`stripHtml`)

`MailerService` gera uma versão texto simples a partir do HTML (`stripHtml`) e envia como parte `text` junto com `html` no e-mail. Isso existe porque e-mails somente-HTML sem fallback de texto tendem a ser classificados como promocionais/marketing por provedores como o Gmail, prejudicando a entregabilidade na caixa principal.

## Modelo de dados

- **`Client`** — `id`, `name`, `apiKey` (hash bcrypt), `createdAt`. Um cliente para cada aplicação/serviço consumidor.
- **`EmailLog`** — `id`, `clientId`, `to[]`, `subject`, `status` (`PENDING`/`SENT`/`FAILED`), `attempts`, `error`, `createdAt`, `updatedAt`. Um registro por tentativa de envio, usado para auditoria e controle de retry.

## Limitações conhecidas / próximos passos possíveis

- Não existe endpoint público para consultar o status de um envio pelo `id` retornado (mencionado no guia de implantação).
- `GET /clients` retorna o hash da API key no payload — não é um segredo reversível, mas vale revisar se faz sentido omitir esse campo da resposta.
- Sem rate limiting por cliente.
- Sem testes automatizados além do scaffold padrão do Nest.
